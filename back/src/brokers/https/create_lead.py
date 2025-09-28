"""Create lead HTTP endpoint."""

import json
import requests
import os
from typing import Dict, Any
from firebase_functions import https_fn, options
from src.apis.Db import Db
from src.util.cors_response import handle_cors_preflight, create_cors_response
from src.util.logger import get_logger

logger = get_logger(__name__)

# reCAPTCHA v3 configuration
RECAPTCHA_VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify"
RECAPTCHA_SCORE_THRESHOLD = 0.3


@https_fn.on_request(
    ingress=options.IngressSetting.ALLOW_ALL,
    timeout_sec=30,
)
def create_lead(req: https_fn.Request):
    """Create lead endpoint for lead capture with reCAPTCHA verification.
    
    Args:
        req: Firebase HTTP request
        
    Returns:
        Success/error response with CORS headers
    """
    try:
        # Handle CORS preflight - only allow POST
        handle_cors_preflight(req, ["POST", "OPTIONS"])
        
        # Only allow POST method
        if req.method != "POST":
            logger.warning(f"Invalid method attempted: {req.method}")
            return create_cors_response(
                {"error": "Method not allowed", "code": "method_not_allowed"},
                status=405
            )
        
        # Parse JSON body
        try:
            request_data = req.get_json(force=True)
            if not request_data:
                raise ValueError("No JSON data provided")
        except Exception as e:
            logger.error(f"Invalid JSON in request: {e}")
            return create_cors_response(
                {"error": "Invalid JSON payload", "code": "invalid_json"},
                status=400
            )
        
        # Validate required fields
        required_fields = ["name", "email", "recaptchaToken"]
        missing_fields = [field for field in required_fields if not request_data.get(field)]
        
        if missing_fields:
            logger.warning(f"Missing required fields: {missing_fields}")
            return create_cors_response(
                {
                    "error": f"Missing required fields: {', '.join(missing_fields)}", 
                    "code": "missing_fields"
                },
                status=400
            )
        
        # Extract and validate data
        name = str(request_data["name"]).strip()
        email = str(request_data["email"]).lower().strip()
        phone = request_data.get("phone", "").strip() if request_data.get("phone") else ""
        recaptcha_token = str(request_data["recaptchaToken"]).strip()
        
        # Validate basic email format
        if "@" not in email or "." not in email:
            logger.warning(f"Invalid email format: {email}")
            return create_cors_response(
                {"error": "Invalid email format", "code": "invalid_email"},
                status=400
            )
        
        # Extract client info
        client_ip = _get_client_ip(req)
        user_agent = req.headers.get("User-Agent", "")
        
        # Extract UTM parameters and tracking info
        utm_data = _extract_utm_data(request_data)
        
        # Verify reCAPTCHA
        recaptcha_score = _verify_recaptcha(recaptcha_token, client_ip)
        
        if recaptcha_score < RECAPTCHA_SCORE_THRESHOLD:
            logger.warning(f"reCAPTCHA score too low: {recaptcha_score} for email: {email}")
            return create_cors_response(
                {
                    "error": "Security verification failed. Please try again.", 
                    "code": "recaptcha_failed"
                },
                status=400
            )
        
        # Store lead in database
        db = Db.get_instance()
        
        # Check for existing lead with same email
        existing_leads = db.collections["leads"].where("email", "==", email).limit(1).get()
        
        lead_data = {
            "name": name,
            "email": email,
            "phone": phone,
            "createdAt": db.server_timestamp,
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
        
        logger.info(f"Lead processed successfully: {lead_id}")
        
        return create_cors_response({
            "ok": True,
            "leadId": lead_id
        })
        
    except Exception as e:
        logger.error(f"Lead creation failed: {e}", exc_info=True)
        return create_cors_response(
            {
                "error": "Internal server error",
                "code": "internal_error"
            },
            status=500
        )


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
