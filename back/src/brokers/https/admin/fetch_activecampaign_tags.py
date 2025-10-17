"""Admin endpoint to fetch available ActiveCampaign tags."""

from firebase_functions import https_fn
from firebase_admin import auth as firebase_auth
from datetime import datetime, timedelta
from typing import Any
from src.util.logger import get_logger
from src.services.activecampaign_service import ActiveCampaignService

logger = get_logger(__name__)

# Simple in-memory cache for tags (5 minutes)
_tags_cache = {
    'tags': [],
    'expires_at': datetime.min
}


@https_fn.on_call()
def fetch_activecampaign_tags(req: https_fn.CallableRequest) -> dict[str, Any]:
    """Fetch available tags from ActiveCampaign for dropdown selection.

    This admin-only endpoint retrieves all tags from ActiveCampaign API v3.
    Results are cached for 5 minutes to reduce API calls.

    Args:
        req: Callable request (no parameters required)

    Returns:
        Dict with:
            - success: Boolean success status
            - tags: List of {id: str, name: str} objects

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
        # Check cache first
        now = datetime.now()
        if _tags_cache['expires_at'] > now and _tags_cache['tags']:
            logger.info(f"Returning cached ActiveCampaign tags for {user.email}")
            return {
                'success': True,
                'tags': _tags_cache['tags']
            }

        # Cache miss - fetch from ActiveCampaign
        ac_service = ActiveCampaignService()
        response = ac_service._request("GET", "/tags")

        # Transform to dropdown format
        tags = []
        for tag_data in response.get("tags", []):
            tags.append({
                'id': tag_data['id'],
                'name': tag_data['tag']
            })

        # Sort by name for better UX
        tags.sort(key=lambda x: x['name'].lower())

        # Update cache
        _tags_cache['tags'] = tags
        _tags_cache['expires_at'] = now + timedelta(minutes=5)

        logger.info(f"Fetched {len(tags)} ActiveCampaign tags for {user.email}")

        return {
            'success': True,
            'tags': tags
        }

    except Exception as e:
        logger.error(f"Error fetching ActiveCampaign tags: {e}")
        # Return empty list with warning instead of failing
        # This allows the UI to fall back to text input
        return {
            'success': False,
            'tags': [],
            'error': str(e)
        }
