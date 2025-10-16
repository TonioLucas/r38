"""Admin endpoint to reject manual verification."""

from firebase_functions import https_fn, options
from firebase_admin import auth as firebase_auth
from typing import Any
from src.util.logger import get_logger
from src.apis.Db import Db

logger = get_logger(__name__)


@https_fn.on_call()
def reject_manual_verification(req: https_fn.CallableRequest) -> dict[str, Any]:
    """Reject manual verification with notes.

    Args:
        req: Callable request with:
            - verificationId: ID of manual_verifications document
            - notes: Admin notes explaining rejection

    Returns:
        Dict with success status

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
    verification_id = data.get('verificationId')
    admin_notes = data.get('notes', '')

    if not verification_id:
        raise https_fn.HttpsError(
            https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
            "verificationId is required"
        )

    if not admin_notes:
        raise https_fn.HttpsError(
            https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
            "notes are required for rejection"
        )

    try:
        db = Db.get_instance()

        # Get verification document
        verification_ref = db.collections['manual_verifications'].document(verification_id)
        verification_doc = verification_ref.get()

        if not verification_doc.exists:
            raise https_fn.HttpsError(
                https_fn.FunctionsErrorCode.NOT_FOUND,
                f"Verification not found: {verification_id}"
            )

        verification_data = verification_doc.to_dict()

        # Check if already processed
        if verification_data.get('status') != 'pending':
            raise https_fn.HttpsError(
                https_fn.FunctionsErrorCode.FAILED_PRECONDITION,
                f"Verification already {verification_data.get('status')}"
            )

        # Update verification status
        verification_ref.update({
            'status': 'rejected',
            'reviewed_by': user.email,
            'reviewed_at': db.timestamp_now(),
            'notes': admin_notes
        })

        logger.info(f"Verification rejected by {user.email}: {verification_id}")

        # Log admin action
        admin_action_data = {
            'admin_email': user.email,
            'admin_uid': req.auth.uid,
            'action': 'reject_verification',
            'target_id': verification_id,
            'details': {
                'customer_email': verification_data.get('email'),
                'notes': admin_notes
            },
            'timestamp': db.timestamp_now()
        }

        db.collections['admin_actions'].add(admin_action_data)

        return {
            'success': True,
            'message': 'Verification rejected successfully'
        }

    except https_fn.HttpsError:
        raise
    except Exception as e:
        logger.error(f"Failed to reject verification: {e}", exc_info=True)
        raise https_fn.HttpsError(
            https_fn.FunctionsErrorCode.INTERNAL,
            f"Failed to reject verification: {str(e)}"
        )
