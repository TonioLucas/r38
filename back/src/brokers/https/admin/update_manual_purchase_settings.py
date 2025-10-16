"""Admin endpoint to update manual purchase override settings."""

from firebase_functions import https_fn
from firebase_admin import auth as firebase_auth
from datetime import datetime
from typing import Any
from src.util.logger import get_logger
from src.apis.Db import Db
import uuid

logger = get_logger(__name__)


@https_fn.on_call()
def update_manual_purchase_settings(req: https_fn.CallableRequest) -> dict[str, Any]:
    """Update manual purchase override settings.

    This admin-only endpoint updates the manual purchase override settings
    in the settings/main Firestore document.

    Features:
    - Enable/disable the override feature
    - Update override price
    - Rotate the override token
    - Admin whitelist enforcement

    Args:
        req: Callable request with:
            - enabled: (optional) Boolean to enable/disable feature
            - override_price_reais: (optional) Float price in reais
            - rotate_token: (optional) Boolean to generate new token
            - updated_by: String admin email

    Returns:
        Dict with success status and message

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

    # Get request data
    data = req.data
    enabled = data.get('enabled')
    override_price_reais = data.get('override_price_reais')
    rotate_token = data.get('rotate_token', False)
    updated_by = data.get('updated_by', user.email)

    db = Db()
    settings_ref = db.collections['settings'].document('main')

    try:
        # Get current settings
        settings_doc = settings_ref.get()

        if settings_doc.exists:
            settings_data = settings_doc.to_dict()
            manual_purchase = settings_data.get('manual_purchase', {})
        else:
            # Initialize if doesn't exist
            manual_purchase = {
                'enabled': False,
                'override_token': str(uuid.uuid4()),
                'override_price_centavos': 500,
                'override_price_reais': 5.00,
                'allowed_admin_emails': admin_emails,
                'created_at': datetime.now(),
                'updated_at': datetime.now(),
                'updated_by': updated_by
            }

        # Update fields
        if enabled is not None:
            manual_purchase['enabled'] = enabled

        if override_price_reais is not None:
            manual_purchase['override_price_reais'] = override_price_reais
            manual_purchase['override_price_centavos'] = int(override_price_reais * 100)

        if rotate_token:
            manual_purchase['override_token'] = str(uuid.uuid4())
            logger.info(f"Manual purchase token rotated by {user.email}")

        # Always update metadata
        manual_purchase['updated_at'] = datetime.now()
        manual_purchase['updated_by'] = updated_by
        manual_purchase['allowed_admin_emails'] = admin_emails

        # Save to Firestore
        settings_ref.set({
            'manual_purchase': manual_purchase
        }, merge=True)

        # Log admin action
        db.collections['admin_actions'].add({
            'action': 'update_manual_purchase_settings',
            'admin_email': user.email,
            'changes': {
                'enabled': enabled,
                'override_price_reais': override_price_reais,
                'token_rotated': rotate_token
            },
            'timestamp': datetime.now()
        })

        logger.info(f"Manual purchase settings updated by {user.email}")

        return {
            'success': True,
            'message': 'Configurações atualizadas com sucesso'
        }

    except Exception as e:
        logger.error(f"Error updating manual purchase settings: {e}")
        raise https_fn.HttpsError(
            https_fn.FunctionsErrorCode.INTERNAL,
            f"Erro ao atualizar configurações: {str(e)}"
        )
