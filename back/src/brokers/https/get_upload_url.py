"""Generate signed Storage URL for file uploads with rate limiting."""

from datetime import datetime, timedelta
from firebase_functions import https_fn, options
from firebase_admin import storage
from flask import jsonify, Request
from src.util.logger import get_logger
from src.apis.Db import Db

logger = get_logger(__name__)

# Rate limiting config
MAX_UPLOADS_PER_EMAIL = 3
RATE_LIMIT_WINDOW_HOURS = 1


def check_rate_limit(db: Db, email: str) -> tuple[bool, int]:
    """Check if email has exceeded upload rate limit.

    Args:
        db: Database instance
        email: User email to check

    Returns:
        tuple: (is_allowed, remaining_attempts)
    """
    cutoff_time = datetime.now() - timedelta(hours=RATE_LIMIT_WINDOW_HOURS)

    # Query upload requests from last hour
    upload_requests = (
        db.collections['upload_requests']
        .where('email', '==', email)
        .where('created_at', '>=', cutoff_time)
        .stream()
    )

    count = sum(1 for _ in upload_requests)
    remaining = max(0, MAX_UPLOADS_PER_EMAIL - count)
    is_allowed = count < MAX_UPLOADS_PER_EMAIL

    return is_allowed, remaining


def validate_file_params(file_name: str, file_size: int, content_type: str) -> tuple[bool, str]:
    """Validate file upload parameters.

    Args:
        file_name: Name of file to upload
        file_size: Size of file in bytes
        content_type: MIME type of file

    Returns:
        tuple: (is_valid, error_message)
    """
    # Validate content type
    allowed_types = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'image/webp']
    if content_type not in allowed_types:
        return False, f"Invalid file type. Allowed: {', '.join(allowed_types)}"

    # Validate file size
    max_size = 100 * 1024 * 1024 if content_type == 'application/pdf' else 5 * 1024 * 1024
    if file_size > max_size:
        max_mb = '100MB' if content_type == 'application/pdf' else '5MB'
        return False, f"File too large. Maximum: {max_mb}"

    if file_size < 1024:  # Minimum 1KB
        return False, "File too small. Minimum: 1KB"

    # Validate filename (basic sanitization)
    if not file_name or len(file_name) > 255:
        return False, "Invalid filename"

    return True, ""


@https_fn.on_call(
    region=options.SupportedRegion.US_CENTRAL1,
    cors=options.CorsOptions(
        cors_origins="*",
        cors_methods=["POST", "OPTIONS"],
    ),
)
def get_upload_url(req: https_fn.CallableRequest) -> dict:
    """Generate signed Storage URL for manual verification uploads.

    Expected request data:
        email: str - User email for rate limiting
        file_name: str - Original filename
        file_size: int - File size in bytes
        content_type: str - MIME type (application/pdf or image/*)
        partner: str - Partner source (batismo-bitcoin or bitcoin-blackpill)

    Returns:
        dict with:
            upload_url: str - Signed URL for PUT upload
            file_path: str - Storage path for reference
            expires_at: str - ISO timestamp when URL expires
    """
    try:
        data = req.data

        # Extract and validate required fields
        email = data.get('email', '').strip().lower()
        file_name = data.get('file_name', '').strip()
        file_size = data.get('file_size', 0)
        content_type = data.get('content_type', '').strip()
        partner = data.get('partner', '').strip()

        if not all([email, file_name, content_type, partner]):
            raise https_fn.HttpsError(
                code=https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
                message="Missing required fields: email, file_name, content_type, partner"
            )

        # Validate email format
        if '@' not in email or len(email) < 5:
            raise https_fn.HttpsError(
                code=https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
                message="Invalid email format"
            )

        # Validate partner
        valid_partners = ['batismo-bitcoin', 'bitcoin-blackpill']
        if partner not in valid_partners:
            raise https_fn.HttpsError(
                code=https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
                message=f"Invalid partner. Must be one of: {', '.join(valid_partners)}"
            )

        # Validate file parameters
        is_valid, error_msg = validate_file_params(file_name, file_size, content_type)
        if not is_valid:
            raise https_fn.HttpsError(
                code=https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
                message=error_msg
            )

        # Initialize database
        db = Db()

        # Check rate limit
        is_allowed, remaining = check_rate_limit(db, email)
        if not is_allowed:
            raise https_fn.HttpsError(
                code=https_fn.FunctionsErrorCode.RESOURCE_EXHAUSTED,
                message=f"Upload limit exceeded. Maximum {MAX_UPLOADS_PER_EMAIL} uploads per {RATE_LIMIT_WINDOW_HOURS} hour(s). Try again later."
            )

        logger.info(f"Rate limit check passed for {email}: {remaining} attempts remaining")

        # Generate unique filename with timestamp
        timestamp = int(datetime.now().timestamp() * 1000)
        # Sanitize original filename
        safe_name = ''.join(c for c in file_name if c.isalnum() or c in '._- ')[:200]
        storage_path = f"manual_verifications/{timestamp}_{safe_name}"

        # Get Storage bucket
        bucket = storage.bucket()
        blob = bucket.blob(storage_path)

        # Generate signed URL (5 minutes expiry)
        expiration_time = datetime.now() + timedelta(minutes=5)
        signed_url = blob.generate_signed_url(
            version="v4",
            expiration=expiration_time,
            method="PUT",
            content_type=content_type
        )

        # Record upload request for rate limiting
        db.collections['upload_requests'].add({
            'email': email,
            'file_name': file_name,
            'file_size': file_size,
            'content_type': content_type,
            'partner': partner,
            'storage_path': storage_path,
            'created_at': db.timestamp_now(),
            'expires_at': expiration_time,
            'status': 'pending'
        })

        logger.info(f"Generated signed URL for {email}: {storage_path}")

        return {
            'upload_url': signed_url,
            'file_path': storage_path,
            'expires_at': expiration_time.isoformat(),
            'remaining_uploads': remaining - 1
        }

    except https_fn.HttpsError:
        raise
    except Exception as e:
        logger.error(f"Error generating upload URL: {e}", exc_info=True)
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.INTERNAL,
            message="Failed to generate upload URL"
        )
