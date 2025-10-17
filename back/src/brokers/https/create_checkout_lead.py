"""Create checkout lead HTTP endpoint."""

import os
from typing import Dict, Any, Optional
from datetime import datetime
import pytz
from firebase_functions import https_fn, options
from flask import jsonify
from src.apis.Db import Db
from src.util.logger import get_logger
from src.util.rate_limiter import rate_limiter
from src.models.firestore_types import LeadStatus

logger = get_logger(__name__)


def get_brazilian_timestamp():
    """Get current timestamp in Brazilian timezone (America/Sao_Paulo)"""
    brazil_tz = pytz.timezone('America/Sao_Paulo')
    return datetime.now(brazil_tz)


def _get_client_ip(req: https_fn.Request) -> str:
    """Extract client IP address from request headers."""
    # Try various headers for IP (handles proxies, load balancers)
    ip = (
        req.headers.get("X-Forwarded-For", "").split(",")[0].strip() or
        req.headers.get("X-Real-IP", "") or
        req.headers.get("CF-Connecting-IP", "") or  # Cloudflare
        req.remote_addr or
        "unknown"
    )
    return ip


def _extract_utm_data(request_data: Dict[str, Any]) -> Dict[str, Any]:
    """Extract UTM parameters from request data."""
    brazil_tz = pytz.timezone('America/Sao_Paulo')
    now = datetime.now(brazil_tz)

    # Extract first-touch attribution
    first_touch = request_data.get("utm", {}).get("firstTouch", {})
    # Extract last-touch attribution (current visit)
    last_touch = request_data.get("utm", {}).get("lastTouch", {})

    return {
        "firstTouch": {
            "source": first_touch.get("source"),
            "medium": first_touch.get("medium"),
            "campaign": first_touch.get("campaign"),
            "term": first_touch.get("term"),
            "content": first_touch.get("content"),
            "referrer": first_touch.get("referrer"),
            "gclid": first_touch.get("gclid"),
            "fbclid": first_touch.get("fbclid"),
            "timestamp": first_touch.get("timestamp", now)
        },
        "lastTouch": {
            "source": last_touch.get("source"),
            "medium": last_touch.get("medium"),
            "campaign": last_touch.get("campaign"),
            "term": last_touch.get("term"),
            "content": last_touch.get("content"),
            "referrer": last_touch.get("referrer"),
            "gclid": last_touch.get("gclid"),
            "fbclid": last_touch.get("fbclid"),
            "timestamp": now
        }
    }


@https_fn.on_request(
    ingress=options.IngressSetting.ALLOW_ALL,
    timeout_sec=30,
    cors=options.CorsOptions(
        cors_origins=["https://renato38.com.br", "https://www.renato38.com.br"],
        cors_methods=["POST", "OPTIONS"],
    )
)
def create_checkout_lead(req: https_fn.Request):
    """Create checkout lead endpoint for checkout abandonment tracking.

    Creates a lead when user completes UserInfo step in checkout flow.
    No ActiveCampaign sync at this stage - sync happens on conversion.

    Args:
        req: Firebase HTTP request

    Returns:
        Success/error response with lead_id
    """
    try:
        # Only allow POST method
        if req.method != "POST":
            logger.warning(f"Invalid method attempted: {req.method}")
            return (jsonify({"error": "Method not allowed", "code": "method_not_allowed"}), 405)

        # Parse JSON body
        try:
            request_data = req.get_json(force=True)
            if not request_data:
                raise ValueError("No JSON data provided")
        except Exception as e:
            logger.error(f"Invalid JSON in request: {e}")
            return (jsonify({"error": "Invalid JSON payload", "code": "invalid_json"}), 400)

        # Validate required fields
        required_fields = ["name", "email", "product_id", "price_id"]
        missing_fields = [field for field in required_fields if not request_data.get(field)]

        if missing_fields:
            logger.warning(f"Missing required fields: {missing_fields}")
            return (jsonify({
                "error": f"Missing required fields: {', '.join(missing_fields)}",
                "code": "missing_fields"
            }), 400)

        # Extract client info for rate limiting
        client_ip = _get_client_ip(req)

        # Rate limiting: Check IP limit
        ip_allowed, ip_remaining = rate_limiter.check_ip_limit(client_ip)
        if not ip_allowed:
            logger.warning(f"Rate limit exceeded for IP: {client_ip}")
            retry_after = rate_limiter.get_retry_after("ip")
            response = jsonify({"error": "Too many requests. Please try again later.", "code": "rate_limit_exceeded"})
            response.status_code = 429
            response.headers["Retry-After"] = str(retry_after)
            return response

        # Extract and validate data
        name = str(request_data["name"]).strip()
        email = str(request_data["email"]).lower().strip()
        phone = request_data.get("phone", "").strip() if request_data.get("phone") else ""
        product_id = str(request_data["product_id"]).strip()
        price_id = str(request_data["price_id"]).strip()
        affiliate_code = request_data.get("affiliate_code", "").strip() if request_data.get("affiliate_code") else None
        partner_offer = request_data.get("partner_offer")  # {partner: str, proofUrl: str}

        # Rate limiting: Check email limit
        email_allowed, email_remaining = rate_limiter.check_email_limit(email)
        if not email_allowed:
            logger.warning(f"Rate limit exceeded for email: {email}")
            retry_after = rate_limiter.get_retry_after("email")
            response = jsonify({"error": "Too many submissions for this email. Please try again tomorrow.", "code": "email_rate_limit"})
            response.status_code = 429
            response.headers["Retry-After"] = str(retry_after)
            return response

        # Validate basic email format
        if "@" not in email or "." not in email:
            logger.warning(f"Invalid email format: {email}")
            return (jsonify({"error": "Invalid email format", "code": "invalid_email"}), 400)

        # Extract user agent
        user_agent = req.headers.get("User-Agent", "")

        # Extract UTM parameters and tracking info
        utm_data = _extract_utm_data(request_data)

        # Determine if manual verification is required
        requires_manual_verification = partner_offer is not None

        # Store lead in database
        db = Db.get_instance()

        # Check for existing checkout lead with same email
        # Note: We search for checkout leads only (source='checkout')
        # Ebook leads are separate and won't interfere
        existing_leads = (
            db.collections["leads"]
            .where("email", "==", email)
            .where("source", "==", "checkout")
            .where("status", "==", LeadStatus.INITIATED.value)
            .limit(1)
            .get()
        )

        lead_data = {
            "name": name,
            "email": email,
            "phone": phone,
            "source": "checkout",
            "status": LeadStatus.INITIATED.value,
            "product_id": product_id,
            "price_id": price_id,
            "requires_manual_verification": requires_manual_verification,
            "createdAt": get_brazilian_timestamp(),
            "updatedAt": get_brazilian_timestamp(),
            "ip": client_ip,
            "userAgent": user_agent,
            "utm": utm_data,
            "consent": {
                "lgpdConsent": request_data.get("consent", {}).get("lgpdConsent", False),
                "consentTextVersion": "v1.0"
            }
        }

        # Add partner offer data if present
        if partner_offer:
            lead_data["verification_id"] = f"partner_{partner_offer.get('partner', 'unknown')}"

        # Add affiliate code if present
        if affiliate_code:
            lead_data["affiliate_code"] = affiliate_code

        if len(list(existing_leads)) > 0:
            # Update existing initiated lead
            existing_lead = list(existing_leads)[0]
            lead_doc_ref = db.collections["leads"].document(existing_lead.id)

            # Update with new data
            lead_doc_ref.update(lead_data)
            lead_id = existing_lead.id
            logger.info(f"Updated existing checkout lead: {lead_id} for email: {email}")
        else:
            # Create new lead
            lead_doc_ref = db.collections["leads"].document()
            lead_doc_ref.set(lead_data)
            lead_id = lead_doc_ref.id
            logger.info(f"Created new checkout lead: {lead_id} for email: {email}, product: {product_id}, requires_manual_verification: {requires_manual_verification}")

        # Return success with lead_id
        # No ActiveCampaign sync at this stage - wait for conversion
        return jsonify({
            "success": True,
            "lead_id": lead_id
        })

    except Exception as e:
        logger.error(f"Error creating checkout lead: {e}", exc_info=True)
        return (jsonify({
            "error": "Internal server error",
            "code": "internal_error"
        }), 500)
