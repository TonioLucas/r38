"""Admin callable function to mark error logs as resolved."""

from firebase_functions import https_fn
from firebase_functions.options import CorsOptions
from datetime import datetime
from typing import Any, Dict
from src.util.logger import get_logger
from src.apis.Db import Db

logger = get_logger(__name__)

# Admin whitelist (same as other admin functions)
ADMIN_WHITELIST = [
    "antonio.lucas.developer@gmail.com",
    "renato@renato38.com.br"
]


@https_fn.on_call(
    cors=CorsOptions(
        cors_origins=["https://renato38.com.br", "https://www.renato38.com.br"],
        cors_methods=["get", "post"]
    )
)
def mark_error_resolved(req: https_fn.CallableRequest) -> Dict[str, Any]:
    """Mark an error log as resolved.

    Callable function restricted to admin whitelist.

    Args:
        req.data.error_log_id: Error log document ID
        req.data.notes: Optional resolution notes

    Returns:
        Dict with success status and message
    """
    # Verify authentication
    if not req.auth:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.UNAUTHENTICATED,
            message="Authentication required"
        )

    # Verify admin authorization
    user_email = req.auth.token.get("email", "")
    if user_email not in ADMIN_WHITELIST:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.PERMISSION_DENIED,
            message="Admin access required"
        )

    # Get request data
    error_log_id = req.data.get("error_log_id")
    notes = req.data.get("notes", "")

    if not error_log_id:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
            message="error_log_id is required"
        )

    try:
        db = Db.get_instance()

        # Get error log document
        error_log_ref = db.collections['error_logs'].document(error_log_id)
        error_log_doc = error_log_ref.get()

        if not error_log_doc.exists:
            raise https_fn.HttpsError(
                code=https_fn.FunctionsErrorCode.NOT_FOUND,
                message=f"Error log not found: {error_log_id}"
            )

        # Update error log as resolved
        error_log_ref.update({
            'resolved': True,
            'resolved_by': user_email,
            'resolved_at': datetime.now(),
            'notes': notes,
            'lastUpdatedAt': datetime.now()
        })

        # Log admin action
        admin_action_data = {
            'action': 'mark_error_resolved',
            'performedBy': user_email,
            'performedAt': datetime.now(),
            'targetCollection': 'error_logs',
            'targetDocId': error_log_id,
            'data': {
                'notes': notes
            }
        }
        db.collections['admin_actions'].add(admin_action_data)

        logger.info(f"Error log {error_log_id} marked as resolved by {user_email}")

        return {
            "success": True,
            "message": f"Error log marked as resolved"
        }

    except https_fn.HttpsError:
        raise
    except Exception as e:
        logger.error(f"Failed to mark error as resolved: {e}", exc_info=True)
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.INTERNAL,
            message=f"Failed to mark error as resolved: {str(e)}"
        )
