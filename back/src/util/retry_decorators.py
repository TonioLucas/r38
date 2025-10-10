"""Retry decorators for transient error handling.

This module provides retry decorators using the Tenacity library for handling
transient errors in external service operations, particularly Firestore operations.
"""

from tenacity import (
    retry,
    stop_after_attempt,
    stop_after_delay,
    wait_exponential,
    retry_if_exception_type,
    RetryCallState,
)
from google.api_core.exceptions import (
    DeadlineExceeded,
    ServiceUnavailable,
    ResourceExhausted,
)

from src.util.logger import get_logger

logger = get_logger(__name__)


def _log_retry_attempt(retry_state: RetryCallState) -> None:
    """Log retry attempts with context.

    Args:
        retry_state: Tenacity retry state object containing attempt info
    """
    exception = retry_state.outcome.exception() if retry_state.outcome else None
    logger.warning(
        f"Firestore operation failed, retrying (attempt {retry_state.attempt_number}): "
        f"{type(exception).__name__}: {exception}"
    )


# Retry decorator for Firestore operations
# CRITICAL: Only retries on transient errors (DeadlineExceeded, ServiceUnavailable, ResourceExhausted)
# Does NOT retry on permanent errors (PermissionDenied, InvalidArgument, NotFound)
retry_firestore_operation = retry(
    retry=retry_if_exception_type((
        DeadlineExceeded,      # Timeout from Firestore
        ServiceUnavailable,    # Firestore temporarily unavailable
        ResourceExhausted,     # Rate limit or quota exceeded
    )),
    stop=(stop_after_attempt(3) | stop_after_delay(25)),  # Max 3 attempts OR 25 seconds
    wait=wait_exponential(multiplier=1, min=1, max=10),   # 1s, 2s, 4s, 8s, 10s...
    before_sleep=_log_retry_attempt,
    reraise=True  # Re-raise exception if all retries exhausted
)
