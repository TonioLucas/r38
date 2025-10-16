"""Admin endpoint to approve manual verification and trigger provisioning."""

from firebase_functions import https_fn, options
from firebase_admin import auth as firebase_auth
from datetime import datetime
from typing import Any
from src.services.customer_provisioning_service import CustomerProvisioningService
from src.util.logger import get_logger
from src.apis.Db import Db

logger = get_logger(__name__)


@https_fn.on_call(
    secrets=["ASTRON_MEMBERS_API_TOKEN", "ACTIVECAMPAIGN_API_KEY", "PASSWORD_ENCRYPTION_KEY"]
)
def approve_manual_verification(req: https_fn.CallableRequest) -> dict[str, Any]:
    """Approve manual verification and trigger customer provisioning.

    This admin-only endpoint:
    1. Updates verification status to 'approved'
    2. Triggers full CustomerProvisioningService workflow:
       - Generates PT-BR readable password
       - Creates Firebase Auth account
       - Creates/updates customer document
       - Creates Astron Members account (R38 club)
       - Generates magic login URL
       - Creates subscription with R$100 pricing
       - Sends welcome email with credentials
    3. Logs admin action for audit trail

    Args:
        req: Callable request with:
            - verificationId: ID of manual_verifications document
            - notes: Admin notes about approval

    Returns:
        Dict with success status and subscription_id

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
            'status': 'approved',
            'reviewed_by': user.email,
            'reviewed_at': db.timestamp_now(),
            'notes': admin_notes
        })

        logger.info(f"Verification approved by {user.email}: {verification_id}")

        # Create subscription document for R$100 onboarding special
        # Generate a customer ID (will be replaced with Firebase UID after provisioning)
        import uuid
        temp_customer_id = str(uuid.uuid4())

        # Create subscription with onboarding special pricing
        subscription_data = {
            'customer_id': temp_customer_id,
            'customer_email': verification_data.get('email'),
            'customer_name': verification_data.get('name'),
            'product_id': 'onboarding-special',  # Special product ID
            'status': 'payment_pending',  # Will be updated to active after provisioning
            'payment_method': 'btc',
            'payment_provider': 'manual',
            'amount_paid': 10000,  # R$100.00 in centavos
            'currency': 'BRL',
            'entitlements': {
                'platform': {
                    'courses': [],  # Will be populated based on product
                    'expires_at': None  # Lifetime access
                },
                'support': {
                    'expires_at': None  # Will be calculated as 6 months from now
                },
                'mentorship': {
                    'enabled': False,
                    'expires_at': None
                }
            },
            'manual_verification': {
                'proof_url': verification_data.get('upload_url', ''),
                'verified_by': user.email,
                'verified_at': db.timestamp_now(),
                'notes': admin_notes
            },
            'created_at': db.timestamp_now(),
            'updated_at': db.timestamp_now()
        }

        # Create subscription
        subscription_ref = db.collections['subscriptions'].document()
        subscription_ref.set(subscription_data)
        subscription_id = subscription_ref.id

        logger.info(f"Created subscription for manual verification: {subscription_id}")

        # Trigger CustomerProvisioningService
        provisioning_service = CustomerProvisioningService()
        provisioning_result = provisioning_service.provision_customer(subscription_id)

        # Update verification with subscription reference
        verification_ref.update({
            'subscription_created': subscription_id
        })

        # Log admin action
        admin_action_data = {
            'admin_email': user.email,
            'admin_uid': req.auth.uid,
            'action': 'approve_verification',
            'target_id': verification_id,
            'details': {
                'customer_email': verification_data.get('email'),
                'subscription_id': subscription_id,
                'notes': admin_notes
            },
            'timestamp': db.timestamp_now()
        }

        db.collections['admin_actions'].add(admin_action_data)

        logger.info(f"Admin action logged: approve_verification for {verification_id}")

        return {
            'success': True,
            'subscription_id': subscription_id,
            'customer_id': provisioning_result.get('customer_id'),
            'firebase_uid': provisioning_result.get('firebase_uid'),
            'message': 'Verification approved and customer provisioned successfully'
        }

    except https_fn.HttpsError:
        raise
    except Exception as e:
        logger.error(f"Failed to approve verification: {e}", exc_info=True)
        raise https_fn.HttpsError(
            https_fn.FunctionsErrorCode.INTERNAL,
            f"Failed to approve verification: {str(e)}"
        )
