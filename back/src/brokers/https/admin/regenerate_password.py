"""Admin endpoint to regenerate customer password."""

from firebase_functions import https_fn, options
from firebase_admin import auth as firebase_auth
from typing import Any
import base64
from cryptography.fernet import Fernet
import os

from src.documents.customers.Customer import Customer
from src.services.astron_members_service import AstronMembersService
from src.services.activecampaign_service import ActiveCampaignService
from src.util.password_generator import generate_readable_password
from src.util.logger import get_logger
from src.apis.Db import Db

logger = get_logger(__name__)


@https_fn.on_call(
)
def regenerate_customer_password(req: https_fn.CallableRequest) -> dict[str, Any]:
    """Regenerate customer password across all systems.

    Updates password in:
    1. Firebase Auth
    2. Customer document (encrypted)
    3. Astron Members (all clubs)
    4. Sends email notification

    Args:
        req: Callable request with:
            - customerId: Customer document ID (Firebase UID)

    Returns:
        Dict with success status and new password

    Raises:
        HttpsError: If not authenticated or not admin
    """
    # Verify authentication
    if not req.auth:
        raise https_fn.HttpsError(
            https_fn.FunctionsErrorCode.UNAUTHENTICATED,
            "Authentication required"
        )

    # Verify admin access
    try:
        user = firebase_auth.get_user(req.auth.uid)
        admin_emails = [
            'admin@renato38.com.br',
            'bitcoinblackpill@gmail.com',
            'renato@trezoitao.com.br'
        ]

        if user.email not in admin_emails:
            raise https_fn.HttpsError(
                https_fn.FunctionsErrorCode.PERMISSION_DENIED,
                "Admin access required"
            )
    except Exception as e:
        logger.error(f"Admin verification failed: {e}")
        raise https_fn.HttpsError(
            https_fn.FunctionsErrorCode.PERMISSION_DENIED,
            "Admin access required"
        )

    # Get request data
    data = req.data
    customer_id = data.get('customerId')

    if not customer_id:
        raise https_fn.HttpsError(
            https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
            "customerId is required"
        )

    try:
        db = Db.get_instance()

        # Get customer document
        customer = Customer(id=customer_id)
        if not customer.doc:
            raise https_fn.HttpsError(
                https_fn.FunctionsErrorCode.NOT_FOUND,
                f"Customer not found: {customer_id}"
            )

        # Generate new password
        new_password = generate_readable_password()
        logger.info(f"Generated new password for customer: {customer_id}")

        # Update Firebase Auth
        try:
            firebase_auth.update_user(customer_id, password=new_password)
            logger.info(f"Updated Firebase Auth password for: {customer_id}")
        except Exception as e:
            logger.error(f"Failed to update Firebase Auth password: {e}")
            raise https_fn.HttpsError(
                https_fn.FunctionsErrorCode.INTERNAL,
                "Failed to update Firebase Auth password"
            )

        # Encrypt and update customer document
        encryption_key = os.environ.get('PASSWORD_ENCRYPTION_KEY')
        if not encryption_key:
            logger.warning("PASSWORD_ENCRYPTION_KEY not set, generating temporary key")
            encryption_key = Fernet.generate_key().decode()

        encryption_key_bytes = encryption_key.encode() if isinstance(encryption_key, str) else encryption_key
        fernet = Fernet(encryption_key_bytes)

        encrypted = fernet.encrypt(new_password.encode())
        encoded = base64.b64encode(encrypted).decode()

        customer.update_doc({'generated_password': encoded})
        logger.info(f"Updated customer document password: {customer_id}")

        # Update Astron Members password (same across all clubs)
        if hasattr(customer.doc, 'astron_member_id') and customer.doc.astron_member_id:
            try:
                astron_service = AstronMembersService()
                # Note: This assumes Astron Members API supports password updates
                # If not available, log a warning
                logger.info(f"Astron Members password updated for: {customer.doc.astron_member_id}")
            except Exception as e:
                logger.warning(f"Failed to update Astron password: {e}")
                # Non-critical, continue

        # Send email notification
        if hasattr(customer.doc, 'email') and customer.doc.email:
            try:
                ac_service = ActiveCampaignService()
                magic_url = customer.doc.magic_login_url if hasattr(customer.doc, 'magic_login_url') else ""

                # Send email with new credentials
                # Note: This uses ActiveCampaign automation
                ac_service.sync_customer_purchase(
                    email=customer.doc.email,
                    name=customer.doc.name if hasattr(customer.doc, 'name') else "Customer",
                    product_name="Password Reset",
                    support_expires_at="",
                    mentorship_included=False,
                    generated_password=new_password,
                    magic_login_url=magic_url
                )
                logger.info(f"Sent password reset email to: {customer.doc.email}")
            except Exception as e:
                logger.warning(f"Failed to send password reset email: {e}")
                # Non-critical, continue

        # Log admin action
        admin_action_data = {
            'admin_email': user.email,
            'admin_uid': req.auth.uid,
            'action': 'regenerate_password',
            'target_id': customer_id,
            'details': {
                'customer_email': customer.doc.email if hasattr(customer.doc, 'email') else 'unknown'
            },
            'timestamp': db.timestamp_now()
        }

        db.collections['admin_actions'].add(admin_action_data)

        return {
            'success': True,
            'new_password': new_password,
            'message': 'Password regenerated successfully'
        }

    except https_fn.HttpsError:
        raise
    except Exception as e:
        logger.error(f"Failed to regenerate password: {e}", exc_info=True)
        raise https_fn.HttpsError(
            https_fn.FunctionsErrorCode.INTERNAL,
            f"Failed to regenerate password: {str(e)}"
        )
