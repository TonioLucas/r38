"""Admin endpoint to regenerate customer magic login URL."""

from firebase_functions import https_fn, options
from firebase_admin import auth as firebase_auth
from typing import Any

from src.documents.customers.Customer import Customer
from src.services.astron_members_service import AstronMembersService
from src.util.logger import get_logger
from src.apis.Db import Db

logger = get_logger(__name__)


@https_fn.on_call(
    secrets=["ASTRON_MEMBERS_AM_KEY", "ASTRON_MEMBERS_AM_SECRET"]
)
def regenerate_magic_login_url(req: https_fn.CallableRequest) -> dict[str, Any]:
    """Regenerate Astron Members magic login URL.

    Args:
        req: Callable request with:
            - customerId: Customer document ID (Firebase UID)

    Returns:
        Dict with success status and new magic login URL

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

        # Check if customer has Astron account
        if not hasattr(customer.doc, 'astron_member_id') or not customer.doc.astron_member_id:
            raise https_fn.HttpsError(
                https_fn.FunctionsErrorCode.FAILED_PRECONDITION,
                "Customer does not have an Astron Members account"
            )

        # Generate new magic login URL
        astron_service = AstronMembersService()
        new_magic_url = astron_service.generate_magic_login_url(
            customer.doc.astron_member_id,
            customer.doc.email if hasattr(customer.doc, 'email') else "",
            "renato38"  # Club subdomain
        )

        logger.info(f"Generated new magic login URL for: {customer_id}")

        # Update customer document
        customer.update_doc({'magic_login_url': new_magic_url})

        # Log admin action
        admin_action_data = {
            'admin_email': user.email,
            'admin_uid': req.auth.uid,
            'action': 'regenerate_magic_link',
            'target_id': customer_id,
            'details': {
                'customer_email': customer.doc.email if hasattr(customer.doc, 'email') else 'unknown',
                'astron_member_id': customer.doc.astron_member_id
            },
            'timestamp': db.timestamp_now()
        }

        db.collections['admin_actions'].add(admin_action_data)

        return {
            'success': True,
            'magic_login_url': new_magic_url,
            'message': 'Magic login URL regenerated successfully'
        }

    except https_fn.HttpsError:
        raise
    except Exception as e:
        logger.error(f"Failed to regenerate magic login URL: {e}", exc_info=True)
        raise https_fn.HttpsError(
            https_fn.FunctionsErrorCode.INTERNAL,
            f"Failed to regenerate magic login URL: {str(e)}"
        )
