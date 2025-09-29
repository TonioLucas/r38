"""Get download link HTTP endpoint with download limits."""

from typing import Dict, Any, Optional
from datetime import datetime, timedelta, timezone
from firebase_functions import https_fn, options
from src.apis.Db import Db
from src.util.logger import get_logger

logger = get_logger(__name__)

# Download configuration
MAX_DOWNLOADS_PER_24H = 3
SIGNED_URL_TTL_MINUTES = 10  # 10 minutes as per PRD recommendation


@https_fn.on_call(
    cors=options.CorsOptions(
        cors_origins="*",  # Allow all origins
        cors_methods=["GET", "POST", "OPTIONS"],
    )
)
def get_download_link(req: https_fn.CallableRequest) -> Dict[str, Any]:
    """Generate signed download link with rate limiting.

    Args:
        req: Firebase Callable request

    Returns:
        Dict with signed URL or error response
    """
    try:
        # Get data from callable request
        request_data = req.data
        
        # Validate required fields
        email = request_data.get("email")
        if not email:
            logger.warning("Missing email in download request")
            raise https_fn.HttpsError(
                code=https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
                message="Email is required"
            )
        
        email = str(email).lower().strip()
        
        # Get database instance
        db = Db.get_instance()
        
        # Find lead by email
        lead = _get_lead_by_email(db, email)
        if not lead:
            logger.warning(f"Lead not found for email: {email}")
            raise https_fn.HttpsError(
                code=https_fn.FunctionsErrorCode.NOT_FOUND,
                message="Lead not found"
            )
        
        lead_id, lead_data = lead
        
        # Check download limits
        can_download, limit_message = _check_download_limits(lead_data)
        if not can_download:
            logger.info(f"Download limit exceeded for email: {email}")
            raise https_fn.HttpsError(
                code=https_fn.FunctionsErrorCode.RESOURCE_EXHAUSTED,
                message=limit_message
            )
        
        # Get e-book storage path from settings
        ebook_path = _get_ebook_storage_path(db)
        if not ebook_path:
            logger.error("E-book storage path not configured")
            raise https_fn.HttpsError(
                code=https_fn.FunctionsErrorCode.FAILED_PRECONDITION,
                message="Download temporarily unavailable - E-book not configured"
            )
        
        # Generate signed URL
        try:
            signed_url = _generate_signed_url(db, ebook_path)
        except Exception as e:
            logger.error(f"Failed to generate signed URL: {e}")
            raise https_fn.HttpsError(
                code=https_fn.FunctionsErrorCode.INTERNAL,
                message="Failed to generate download link"
            )
        
        # Update download counters
        _update_download_counters(db, lead_id, lead_data)
        
        logger.info(f"Generated download link for email: {email}")
        
        return {
            "success": True,
            "downloadUrl": signed_url,
            "expiresIn": SIGNED_URL_TTL_MINUTES * 60,  # seconds
            "remainingDownloads": MAX_DOWNLOADS_PER_24H - (lead_data.get("download", {}).get("count24h", 0) + 1)
        }
        
    except Exception as e:
        logger.error(f"Download link generation failed: {e}", exc_info=True)
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.INTERNAL,
            message="Internal server error"
        )


def _get_lead_by_email(db: Db, email: str) -> Optional[tuple]:
    """Find lead by email address.
    
    Args:
        db: Database instance
        email: Email address to search for
        
    Returns:
        Tuple of (lead_id, lead_data) or None if not found
    """
    try:
        leads_query = db.collections["leads"].where("email", "==", email).limit(1).get()
        leads_list = list(leads_query)
        
        if not leads_list:
            return None
        
        lead_doc = leads_list[0]
        return lead_doc.id, lead_doc.to_dict()
        
    except Exception as e:
        logger.error(f"Error querying lead by email {email}: {e}")
        return None


def _check_download_limits(lead_data: Dict[str, Any]) -> tuple[bool, str]:
    """Check if lead can download based on 24h limits.
    
    Args:
        lead_data: Lead document data
        
    Returns:
        Tuple of (can_download: bool, message: str)
    """
    download_info = lead_data.get("download", {})
    current_count = download_info.get("count24h", 0)
    last_download = download_info.get("lastDownloadedAt")
    
    # If no previous downloads, allow
    if current_count == 0 or not last_download:
        return True, ""
    
    # Check if we're within 24h window of last download
    now = datetime.now(timezone.utc)
    
    # Handle both Firestore timestamp and datetime objects
    if hasattr(last_download, 'to_pydatetime'):
        last_download_dt = last_download.to_pydatetime()
    else:
        last_download_dt = last_download
    
    # Ensure last_download_dt is timezone-aware
    if last_download_dt.tzinfo is None:
        last_download_dt = last_download_dt.replace(tzinfo=timezone.utc)
    
    time_since_last = now - last_download_dt
    
    # If more than 24 hours have passed, reset the counter (conceptually)
    if time_since_last >= timedelta(hours=24):
        return True, ""
    
    # Within 24h window - check count
    if current_count >= MAX_DOWNLOADS_PER_24H:
        hours_remaining = 24 - (time_since_last.total_seconds() / 3600)
        return False, f"Download limit reached. Try again in {int(hours_remaining)} hours."
    
    return True, ""


def _get_ebook_storage_path(db: Db) -> Optional[str]:
    """Get e-book storage path from settings collection.
    
    Args:
        db: Database instance
        
    Returns:
        Storage path string or None if not configured
    """
    try:
        settings_doc = db.collections["settings"].document("main").get()
        
        if not settings_doc.exists:
            logger.warning("Settings document not found")
            return None
        
        settings_data = settings_doc.to_dict()
        ebook_config = settings_data.get("ebook", {})
        storage_path = ebook_config.get("storagePath")
        
        if not storage_path:
            logger.warning("E-book storage path not configured in settings")
            return None
        
        return storage_path
        
    except Exception as e:
        logger.error(f"Error retrieving e-book storage path: {e}")
        return None


def _generate_signed_url(db: Db, storage_path: str) -> str:
    """Generate signed URL for e-book download.
    
    Args:
        db: Database instance
        storage_path: Path to file in Firebase Storage
        
    Returns:
        Signed URL string
        
    Raises:
        Exception: If URL generation fails
    """
    try:
        # Use custom TTL for download links (shorter than default)
        from firebase_admin import storage
        from datetime import timedelta
        
        if storage_path.startswith("/"):
            storage_path = storage_path[1:]
            
        bucket = storage.bucket()
        blob = bucket.blob(storage_path)
        
        # Check if file exists
        if not blob.exists():
            raise Exception(f"File not found in storage: {storage_path}")
        
        signed_url = blob.generate_signed_url(
            version="v4",
            expiration=timedelta(minutes=SIGNED_URL_TTL_MINUTES),
            method="GET",
            credentials=db._get_signed_url_credentials(),
        )
        
        return signed_url
        
    except Exception as e:
        logger.error(f"Failed to generate signed URL for {storage_path}: {e}")
        raise


def _update_download_counters(db: Db, lead_id: str, lead_data: Dict[str, Any]):
    """Update download counters and timestamps.
    
    Args:
        db: Database instance
        lead_id: Lead document ID
        lead_data: Current lead data
    """
    try:
        now = db.timestamp_now()
        download_info = lead_data.get("download", {})
        current_count = download_info.get("count24h", 0)
        last_download = download_info.get("lastDownloadedAt")
        first_download = download_info.get("firstDownloadedAt")
        
        # Reset count if more than 24h have passed since last download
        if last_download:
            # Handle both Firestore timestamp and datetime objects
            if hasattr(last_download, 'to_pydatetime'):
                last_download_dt = last_download.to_pydatetime()
            else:
                last_download_dt = last_download
            
            # Ensure timezone-aware
            if last_download_dt.tzinfo is None:
                last_download_dt = last_download_dt.replace(tzinfo=timezone.utc)
            
            time_since_last = now - last_download_dt
            
            if time_since_last >= timedelta(hours=24):
                current_count = 0  # Reset count for new 24h window
        
        # Prepare update data
        update_data = {
            "download.count24h": current_count + 1,
            "download.lastDownloadedAt": now
        }
        
        # Set first download timestamp if this is the first download
        if not first_download:
            update_data["download.firstDownloadedAt"] = now
        
        # Update the lead document
        db.collections["leads"].document(lead_id).update(update_data)
        
        logger.info(f"Updated download counters for lead {lead_id}: count={current_count + 1}")
        
    except Exception as e:
        logger.error(f"Failed to update download counters for lead {lead_id}: {e}")
        # Don't raise here - we still want to provide the download link
        # even if counter update fails
