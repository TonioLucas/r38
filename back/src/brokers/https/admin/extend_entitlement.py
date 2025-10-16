"""Admin endpoint to extend subscription entitlements."""

from firebase_functions import https_fn, options
from firebase_admin import auth as firebase_auth
from typing import Any
from datetime import datetime, timedelta

from src.documents.customers.Subscription import Subscription
from src.util.logger import get_logger
from src.apis.Db import Db

logger = get_logger(__name__)


@https_fn.on_call()
def extend_subscription_entitlement(req: https_fn.CallableRequest) -> dict[str, Any]:
    """Extend specific entitlement expiration date.

    Args:
        req: Callable request with:
            - subscriptionId: Subscription document ID
            - entitlementType: 'platform' | 'support' | 'mentorship'
            - days: Number of days to extend

    Returns:
        Dict with success status and new expiration date

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
    subscription_id = data.get('subscriptionId')
    entitlement_type = data.get('entitlementType')
    days = data.get('days')

    if not subscription_id:
        raise https_fn.HttpsError(
            https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
            "subscriptionId is required"
        )

    if not entitlement_type or entitlement_type not in ['platform', 'support', 'mentorship']:
        raise https_fn.HttpsError(
            https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
            "entitlementType must be 'platform', 'support', or 'mentorship'"
        )

    if not days or not isinstance(days, (int, float)) or days <= 0:
        raise https_fn.HttpsError(
            https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
            "days must be a positive number"
        )

    try:
        db = Db.get_instance()

        # Get subscription document
        subscription = Subscription(id=subscription_id)
        if not subscription.doc:
            raise https_fn.HttpsError(
                https_fn.FunctionsErrorCode.NOT_FOUND,
                f"Subscription not found: {subscription_id}"
            )

        # Get current entitlements
        entitlements = subscription.doc.entitlements if hasattr(subscription.doc, 'entitlements') else {}

        # Calculate new expiration date
        current_expiration = None
        if entitlement_type in entitlements:
            entitlement_data = entitlements[entitlement_type]
            if isinstance(entitlement_data, dict) and 'expires_at' in entitlement_data:
                current_expiration = entitlement_data['expires_at']

        # Start from current expiration or now
        if current_expiration and current_expiration is not None:
            try:
                # If it's a Firestore timestamp
                if hasattr(current_expiration, 'timestamp'):
                    base_date = datetime.fromtimestamp(current_expiration.timestamp())
                elif isinstance(current_expiration, datetime):
                    base_date = current_expiration
                else:
                    base_date = datetime.now()
            except:
                base_date = datetime.now()
        else:
            base_date = datetime.now()

        new_expiration = base_date + timedelta(days=int(days))

        # Update entitlement
        update_path = f'entitlements.{entitlement_type}.expires_at'
        subscription.update_doc({
            update_path: db.timestamp_from_datetime(new_expiration),
            'updated_at': db.timestamp_now()
        })

        logger.info(f"Extended {entitlement_type} entitlement for subscription {subscription_id} by {days} days")

        # Log admin action
        admin_action_data = {
            'admin_email': user.email,
            'admin_uid': req.auth.uid,
            'action': 'extend_entitlement',
            'target_id': subscription_id,
            'details': {
                'entitlement_type': entitlement_type,
                'days_extended': days,
                'new_expiration': new_expiration.isoformat(),
                'customer_id': subscription.doc.customer_id if hasattr(subscription.doc, 'customer_id') else 'unknown'
            },
            'timestamp': db.timestamp_now()
        }

        db.collections['admin_actions'].add(admin_action_data)

        return {
            'success': True,
            'new_expiration': new_expiration.isoformat(),
            'message': f'{entitlement_type.capitalize()} entitlement extended by {days} days'
        }

    except https_fn.HttpsError:
        raise
    except Exception as e:
        logger.error(f"Failed to extend entitlement: {e}", exc_info=True)
        raise https_fn.HttpsError(
            https_fn.FunctionsErrorCode.INTERNAL,
            f"Failed to extend entitlement: {str(e)}"
        )
