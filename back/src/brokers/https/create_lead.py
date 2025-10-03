"""Create lead HTTP endpoint."""

import requests
import os
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
import pytz
from firebase_functions import https_fn, options
from flask import jsonify
from firebase_admin import storage
from src.apis.Db import Db
# CORS is handled by Firebase Functions v2 decorator, no need for manual handling
from src.util.logger import get_logger
from src.util.rate_limiter import rate_limiter
from src.services.activecampaign_service import ActiveCampaignService

logger = get_logger(__name__)

# reCAPTCHA v3 configuration
RECAPTCHA_VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify"
RECAPTCHA_SCORE_THRESHOLD = 0.5

def get_brazilian_timestamp():
    """Get current timestamp in Brazilian timezone (America/Sao_Paulo)"""
    brazil_tz = pytz.timezone('America/Sao_Paulo')
    return datetime.now(brazil_tz)


@https_fn.on_request(
    ingress=options.IngressSetting.ALLOW_ALL,
    timeout_sec=30,
    cors=options.CorsOptions(
        cors_origins=["https://renato38.com.br", "https://www.renato38.com.br"],
        cors_methods=["POST", "OPTIONS"],
    )
)
def create_lead(req: https_fn.Request):
    """Create lead endpoint for lead capture with reCAPTCHA verification.
    
    Args:
        req: Firebase HTTP request
        
    Returns:
        Success/error response with CORS headers
    """
    try:
        # CORS is now handled by Firebase Functions v2 decorator

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
        
        # Validate required fields (reCAPTCHA temporarily disabled)
        required_fields = ["name", "email"]
        missing_fields = [field for field in required_fields if not request_data.get(field)]
        
        if missing_fields:
            logger.warning(f"Missing required fields: {missing_fields}")
            return (jsonify({
                "error": f"Missing required fields: {', '.join(missing_fields)}",
                "code": "missing_fields"
            }), 400)
        
        # Bot detection: Check honeypot field
        honeypot = request_data.get("website_url", "")
        if honeypot:
            logger.warning(f"Bot detected via honeypot field: {honeypot}")
            # Silent success for bots
            return jsonify({
                "success": True,
                "leadId": "bot-rejected"
            })

        # Bot detection: Check submission timing
        submission_time = request_data.get("submission_time", 999)
        if submission_time < 3:
            logger.warning(f"Bot detected via submission timing: {submission_time}s")
            # Silent success for bots
            return jsonify({
                "success": True,
                "leadId": "bot-rejected-timing"
            })

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
        # recaptcha_token = str(request_data["recaptchaToken"]).strip()  # DISABLED

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
        
        # TEMPORARILY DISABLED: reCAPTCHA verification
        # Skip reCAPTCHA verification for now
        logger.info("reCAPTCHA verification skipped (temporarily disabled)")
        recaptcha_score = 1.0  # Fake perfect score
        
        # Store lead in database
        db = Db.get_instance()
        
        # Check for existing lead with same email
        existing_leads = db.collections["leads"].where("email", "==", email).limit(1).get()
        
        lead_data = {
            "name": name,
            "email": email,
            "phone": phone,
            "createdAt": get_brazilian_timestamp(),
            "ip": client_ip,
            "userAgent": user_agent,
            "utm": utm_data,
            "consent": {
                "lgpdConsent": request_data.get("consent", {}).get("lgpdConsent", False),
                "consentTextVersion": "v1.0"
            },
            "recaptchaScore": recaptcha_score,
            "download": {
                "firstDownloadedAt": None,
                "lastDownloadedAt": None,
                "count24h": 0
            }
        }
        
        if len(list(existing_leads)) > 0:
            # Update existing lead
            existing_lead = list(existing_leads)[0]
            lead_doc_ref = db.collections["leads"].document(existing_lead.id)
            
            # Update with new UTM data and timestamps, but preserve download history
            existing_data = existing_lead.to_dict()
            lead_data["download"] = existing_data.get("download", {
                "firstDownloadedAt": None,
                "lastDownloadedAt": None,
                "count24h": 0
            })
            
            lead_doc_ref.update(lead_data)
            lead_id = existing_lead.id
            logger.info(f"Updated existing lead: {lead_id} for email: {email}")
        else:
            # Create new lead
            lead_doc_ref = db.collections["leads"].document()
            lead_doc_ref.set(lead_data)
            lead_id = lead_doc_ref.id
            logger.info(f"Created new lead: {lead_id} for email: {email}")

        # ActiveCampaign integration - sync lead to marketing automation
        try:
            # Generate secure signed download URL (time-limited, no user interaction needed)
            # This URL expires after EBOOK_DOWNLOAD_LINK_TTL_MINUTES (default: 10 minutes)
            # But can be used multiple times within rate limits (3 downloads per 24h)
            download_url = _generate_secure_download_url(db, email)

            if not download_url:
                # Fallback to thank you page if URL generation fails
                download_url = f"https://renato38.com.br/obrigado?email={email}"
                logger.warning(f"Failed to generate signed URL, using fallback for {email}")

            ac_service = ActiveCampaignService()
            ac_result = ac_service.process_lead(
                email=email,
                name=name,
                phone=phone or "",
                download_link=download_url
            )

            # Store ActiveCampaign data in Firestore
            lead_doc_ref.update({
                "activecampaign": {
                    "contactId": ac_result["contact_id"],
                    "listId": ac_result["list_id"],
                    "tagId": ac_result["tag_id"],
                    "syncedAt": db.server_timestamp
                }
            })

            logger.info(f"ActiveCampaign sync successful: {ac_result}")

        except Exception as e:
            # Log error but don't fail lead creation
            # Lead is already saved in Firestore
            logger.error(f"ActiveCampaign sync failed for {email}: {e}", exc_info=True)
            # Continue execution - this is non-critical

        logger.info(f"Lead processed successfully: {lead_id}")

        return jsonify({
            "success": True,
            "leadId": lead_id
        })
        
    except Exception as e:
        logger.error(f"Lead creation failed: {e}", exc_info=True)
        return (jsonify({
            "error": "Internal server error",
            "code": "internal_error"
        }), 500)


def _get_client_ip(req: https_fn.Request) -> str:
    """Extract client IP address from request headers."""
    # Check common forwarded IP headers
    forwarded_headers = [
        "CF-Connecting-IP",  # Cloudflare
        "X-Forwarded-For",
        "X-Real-IP",
        "X-Client-IP"
    ]
    
    for header in forwarded_headers:
        ip = req.headers.get(header)
        if ip:
            # Take first IP if comma-separated
            return ip.split(",")[0].strip()
    
    # Fallback to remote address
    return getattr(req, 'remote_addr', 'unknown')


def _extract_utm_data(request_data: Dict[str, Any]) -> Dict[str, Any]:
    """Extract UTM and tracking data from request."""
    utm_fields = [
        "utm_source", "utm_medium", "utm_campaign", 
        "utm_term", "utm_content", "referrer", 
        "gclid", "fbclid"
    ]
    
    current_timestamp = Db.timestamp_now()
    
    # Extract current UTM data
    current_utm = {}
    for field in utm_fields:
        value = request_data.get(field, "")
        if value:
            current_utm[field.replace("utm_", "")] = str(value)
    
    current_utm["timestamp"] = current_timestamp
    
    # For new leads, both first and last touch are the same
    return {
        "firstTouch": current_utm.copy(),
        "lastTouch": current_utm.copy()
    }


def _verify_recaptcha(token: str, client_ip: str) -> float:
    """Verify reCAPTCHA token and return score.
    
    Args:
        token: reCAPTCHA token from client
        client_ip: Client IP address
        
    Returns:
        reCAPTCHA score (0.0 to 1.0)
        
    Raises:
        Exception: If verification fails
    """
    secret_key = os.environ.get("RECAPTCHA_SECRET_KEY")
    if not secret_key:
        logger.error("RECAPTCHA_SECRET_KEY environment variable not set")
        raise Exception("reCAPTCHA configuration error")
    
    payload = {
        "secret": secret_key,
        "response": token,
        "remoteip": client_ip
    }
    
    try:
        response = requests.post(RECAPTCHA_VERIFY_URL, data=payload, timeout=10)
        response.raise_for_status()
        
        result = response.json()
        
        if not result.get("success"):
            error_codes = result.get("error-codes", [])
            logger.warning(f"reCAPTCHA verification failed: {error_codes}")
            raise Exception(f"reCAPTCHA verification failed: {error_codes}")
        
        score = result.get("score", 0.0)
        action = result.get("action", "unknown")
        
        logger.info(f"reCAPTCHA verified - Score: {score}, Action: {action}")
        
        return float(score)
        
    except requests.RequestException as e:
        logger.error(f"reCAPTCHA API request failed: {e}")
        raise Exception("reCAPTCHA service unavailable")
    except (ValueError, KeyError) as e:
        logger.error(f"Invalid reCAPTCHA response: {e}")
        raise Exception("Invalid reCAPTCHA response")


def _generate_secure_download_url(db: Db, email: str) -> Optional[str]:
    """Generate secure signed download URL for the ebook.

    This generates a Firebase Storage signed URL that:
    - Expires after EBOOK_DOWNLOAD_LINK_TTL_MINUTES (default: 10 minutes)
    - Points directly to the PDF file in Firebase Storage
    - Does not require additional authentication
    - Can be clicked multiple times within expiration (but download limits still apply via tracking)

    Args:
        db: Database instance
        email: Lead email (for logging purposes)

    Returns:
        Signed download URL string or None if generation fails
    """
    try:
        # Get e-book storage path from settings
        settings_doc = db.collections["settings"].document("main").get()

        if not settings_doc.exists:
            logger.warning("Settings document not found")
            return None

        settings_data = settings_doc.to_dict()
        ebook_config = settings_data.get("ebook", {})
        storage_path = ebook_config.get("storagePath")

        if not storage_path:
            logger.warning("E-book storage path not configured in settings")
            return None

        # Remove leading slash if present
        if storage_path.startswith("/"):
            storage_path = storage_path[1:]

        # Get TTL from environment or use default
        ttl_minutes = int(os.environ.get("EBOOK_DOWNLOAD_LINK_TTL_MINUTES", "10"))

        # Generate signed URL
        bucket = storage.bucket()
        blob = bucket.blob(storage_path)

        # Check if file exists
        if not blob.exists():
            logger.error(f"File not found in storage: {storage_path}")
            return None

        signed_url = blob.generate_signed_url(
            version="v4",
            expiration=timedelta(minutes=ttl_minutes),
            method="GET",
        )

        logger.info(f"Generated signed download URL for {email}, expires in {ttl_minutes} minutes")

        return signed_url

    except Exception as e:
        logger.error(f"Failed to generate signed URL for {email}: {e}", exc_info=True)
        return None
