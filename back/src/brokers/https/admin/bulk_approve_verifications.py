"""Admin endpoint to bulk approve auto-generated manual verifications."""

from firebase_functions import https_fn, options
from firebase_admin import auth as firebase_auth
from typing import Any
from src.services.customer_provisioning_service import CustomerProvisioningService
from src.util.logger import get_logger
from src.apis.Db import Db

logger = get_logger(__name__)


@https_fn.on_call()
def bulk_approve_auto_generated_verifications(req: https_fn.CallableRequest) -> dict[str, Any]:
    """Bulk approve all pending auto-generated manual verifications.

    This admin-only endpoint:
    1. Finds all pending verifications with auto_generated=True
    2. For each verification:
       - Triggers provisioning via CustomerProvisioningService
       - Updates status to 'approved' on success
       - Logs errors but continues processing remaining verifications
    3. Returns summary of successes and failures

    Args:
        req: Callable request (no data required)

    Returns:
        Dict with:
            - success_count: Number of verifications approved successfully
            - fail_count: Number of verifications that failed
            - errors: List of error details
            - total_processed: Total verifications attempted

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
            'antoniolucasdeor@gmail.com',
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

    try:
        db = Db.get_instance()

        # Query all pending auto-generated verifications
        verifications_query = db.collections['manual_verifications'].where(
            'status', '==', 'pending'
        ).where(
            'auto_generated', '==', True
        ).stream()

        verifications = list(verifications_query)
        total_count = len(verifications)

        if total_count == 0:
            logger.info("No pending auto-generated verifications found")
            return {
                'success_count': 0,
                'fail_count': 0,
                'total_processed': 0,
                'errors': [],
                'message': 'No pending auto-generated verifications found'
            }

        logger.info(f"Found {total_count} pending auto-generated verifications to process")

        # Process each verification
        success_count = 0
        fail_count = 0
        errors = []

        provisioning_service = CustomerProvisioningService()

        for verification_doc in verifications:
            verification_id = verification_doc.id
            verification_data = verification_doc.to_dict()
            verification_ref = db.collections['manual_verifications'].document(verification_id)

            try:
                # Check if subscription already exists
                subscription_id = verification_data.get('subscription_created')

                if not subscription_id:
                    # This should not happen for auto-generated verifications
                    error_msg = f"No subscription_id found for verification {verification_id}"
                    logger.error(error_msg)
                    errors.append({
                        'verification_id': verification_id,
                        'email': verification_data.get('email'),
                        'error': error_msg
                    })
                    fail_count += 1
                    continue

                # Trigger provisioning
                provisioning_result = provisioning_service.provision_customer(subscription_id)

                # Update verification status to approved
                verification_ref.update({
                    'status': 'approved',
                    'reviewed_by': user.email,
                    'reviewed_at': db.timestamp_now(),
                    'notes': f'Bulk approved by {user.email}'
                })

                logger.info(f"Successfully bulk-approved verification {verification_id}")
                success_count += 1

            except Exception as e:
                error_msg = str(e)
                logger.error(f"Failed to bulk-approve verification {verification_id}: {error_msg}", exc_info=True)

                # Return verification to pending state with error details
                try:
                    verification_ref.update({
                        'provisioning_error': error_msg,
                        'provisioning_failed_at': db.timestamp_now()
                    })
                except Exception as update_error:
                    logger.error(f"Failed to update error status for {verification_id}: {update_error}")

                errors.append({
                    'verification_id': verification_id,
                    'email': verification_data.get('email'),
                    'error': error_msg
                })
                fail_count += 1

        # Log admin action
        admin_action_data = {
            'admin_email': user.email,
            'admin_uid': req.auth.uid,
            'action': 'bulk_approve_verifications',
            'details': {
                'total_processed': total_count,
                'success_count': success_count,
                'fail_count': fail_count,
                'errors': errors
            },
            'timestamp': db.timestamp_now()
        }

        db.collections['admin_actions'].add(admin_action_data)

        logger.info(f"Bulk approval complete: {success_count} successes, {fail_count} failures")

        return {
            'success_count': success_count,
            'fail_count': fail_count,
            'total_processed': total_count,
            'errors': errors,
            'message': f'Processed {total_count} verifications: {success_count} approved, {fail_count} failed'
        }

    except https_fn.HttpsError:
        raise
    except Exception as e:
        logger.error(f"Failed to bulk approve verifications: {e}", exc_info=True)
        raise https_fn.HttpsError(
            https_fn.FunctionsErrorCode.INTERNAL,
            f"Failed to bulk approve verifications: {str(e)}"
        )
