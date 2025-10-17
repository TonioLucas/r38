"""Admin endpoint to update ActiveCampaign automation tag settings."""

from firebase_functions import https_fn
from firebase_admin import auth as firebase_auth
from datetime import datetime
from typing import Any
from src.util.logger import get_logger
from src.apis.Db import Db

logger = get_logger(__name__)


@https_fn.on_call()
def update_activecampaign_settings(req: https_fn.CallableRequest) -> dict[str, Any]:
    """Update ActiveCampaign tag settings.

    This admin-only endpoint updates the ActiveCampaign tag configuration
    in the settings/main Firestore document.

    Features:
    - Configure ebook tag name
    - Configure provisioning tag name (replaces hardcoded "Trigger_Welcome_Email")
    - Configure abandoned checkout tag name
    - Admin whitelist enforcement

    Args:
        req: Callable request with:
            - ebook_tag_name: (optional) String tag name for ebook downloads
            - provisioning_tag_name: (optional) String tag name for post-purchase provisioning
            - abandoned_checkout_tag_name: (optional) String tag name for abandoned cart remarketing
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
    ebook_tag_name = data.get('ebook_tag_name')
    provisioning_tag_name = data.get('provisioning_tag_name')
    abandoned_checkout_tag_name = data.get('abandoned_checkout_tag_name')
    updated_by = data.get('updated_by', user.email)

    db = Db()
    settings_ref = db.collections['settings'].document('main')

    try:
        # Get current settings
        settings_doc = settings_ref.get()

        if settings_doc.exists:
            settings_data = settings_doc.to_dict()
            activecampaign = settings_data.get('activecampaign', {})
        else:
            # Initialize if doesn't exist
            activecampaign = {}

        # Track what changed for logging
        changes = {}

        # Update fields if provided
        if ebook_tag_name is not None:
            activecampaign['ebook_tag_name'] = ebook_tag_name
            changes['ebook_tag_name'] = ebook_tag_name

        if provisioning_tag_name is not None:
            activecampaign['provisioning_tag_name'] = provisioning_tag_name
            changes['provisioning_tag_name'] = provisioning_tag_name

        if abandoned_checkout_tag_name is not None:
            activecampaign['abandoned_checkout_tag_name'] = abandoned_checkout_tag_name
            changes['abandoned_checkout_tag_name'] = abandoned_checkout_tag_name

        # Always update metadata
        activecampaign['updated_at'] = datetime.now()
        activecampaign['updated_by'] = updated_by

        # Save to Firestore with merge=True (preserve other settings sections)
        settings_ref.set({
            'activecampaign': activecampaign
        }, merge=True)

        # Log admin action
        db.collections['admin_actions'].add({
            'action': 'update_activecampaign_settings',
            'admin_email': user.email,
            'changes': changes,
            'timestamp': datetime.now()
        })

        logger.info(f"ActiveCampaign settings updated by {user.email}: {changes}")

        return {
            'success': True,
            'message': 'Configurações do ActiveCampaign atualizadas com sucesso'
        }

    except Exception as e:
        logger.error(f"Error updating ActiveCampaign settings: {e}")
        raise https_fn.HttpsError(
            https_fn.FunctionsErrorCode.INTERNAL,
            f"Erro ao atualizar configurações: {str(e)}"
        )
