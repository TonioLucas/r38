"""Manual customer provisioning HTTP endpoint for admin recovery."""

from firebase_functions import https_fn, options
from flask import jsonify, Request
from src.services.customer_provisioning_service import CustomerProvisioningService
from src.util.db_auth_wrapper import db_auth_wrapper
from src.util.logger import get_logger
from src.exceptions.CustomError import ValidationError

logger = get_logger(__name__)


@https_fn.on_request(
    cors=options.CorsOptions(cors_origins=["*"], cors_methods=["POST", "OPTIONS"]),
    ingress=options.IngressSetting.ALLOW_ALL,
    timeout_sec=60
)
def provision_customer(req: Request):
    """Manual provisioning trigger for admin recovery.

    This endpoint allows admins to manually trigger provisioning for a subscription
    in case automatic provisioning failed.

    Args:
        req: Firebase HTTP request

    Returns:
        JSON response with provisioning results
    """
    try:
        # Handle CORS preflight
        if req.method == "OPTIONS":
            headers = {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, Authorization",
                "Access-Control-Max-Age": "3600"
            }
            return ("", 204, headers)

        # Verify authentication
        auth_header = req.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            logger.error("Missing or invalid authorization header")
            return (jsonify({"error": "Unauthorized"}), 401)

        # Extract token and verify admin
        token = auth_header.split("Bearer ")[1]

        try:
            # Verify auth and check admin status
            uid = db_auth_wrapper(token)

            # Check if user is admin
            import os
            admin_emails = os.environ.get("ADMIN_EMAILS", "").split(",")

            # Get user from Firebase Auth to check email
            from firebase_admin import auth
            user = auth.get_user(uid)

            if user.email not in admin_emails:
                logger.error(f"Non-admin user attempted to provision: {user.email}")
                return (jsonify({"error": "Admin access required"}), 403)

        except Exception as auth_error:
            logger.error(f"Authentication failed: {auth_error}")
            return (jsonify({"error": "Authentication failed"}), 401)

        # Get subscription ID from request
        data = req.get_json(silent=True)
        if not data:
            return (jsonify({"error": "No data provided"}), 400)

        subscription_id = data.get("subscription_id")
        if not subscription_id:
            return (jsonify({"error": "subscription_id required"}), 400)

        logger.info(f"Admin {user.email} triggering provisioning for subscription: {subscription_id}")

        # Trigger provisioning
        provisioning_service = CustomerProvisioningService()
        result = provisioning_service.provision_customer(subscription_id)

        logger.info(f"Provisioning completed for subscription: {subscription_id}")

        return (jsonify({
            "success": True,
            "message": f"Provisioning complete for {subscription_id}",
            "result": result
        }), 200)

    except ValidationError as e:
        logger.error(f"Validation error: {e}")
        return (jsonify({"error": str(e)}), 400)

    except ValueError as e:
        logger.error(f"Value error: {e}")
        return (jsonify({"error": str(e)}), 400)

    except Exception as e:
        logger.error(f"Manual provisioning failed: {e}", exc_info=True)
        return (jsonify({
            "error": "Provisioning failed",
            "message": str(e)
        }), 500)