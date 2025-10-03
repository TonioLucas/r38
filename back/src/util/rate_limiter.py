from datetime import datetime, timedelta
from typing import Tuple
import hashlib
from firebase_admin import firestore
from src.apis.Db import Db


class RateLimiter:
    """Firestore-backed rate limiter for preventing abuse of public endpoints.

    Uses Firestore for persistence to survive Cloud Functions cold starts.
    Rate limit documents are stored in the 'rate_limits' collection with TTL cleanup.
    """

    def __init__(self):
        self.db = Db.get_instance()

    def check_ip_limit(self, ip: str, limit: int = 10, window: int = 3600) -> Tuple[bool, int]:
        """
        Check IP rate limit (10 per hour default) using Firestore.

        Args:
            ip: IP address to check
            limit: Maximum requests allowed in window
            window: Time window in seconds

        Returns:
            Tuple of (is_allowed, remaining_count)
        """
        now = datetime.now()
        window_start = now - timedelta(seconds=window)

        # Hash IP for privacy
        ip_hash = hashlib.sha256(ip.encode()).hexdigest()[:16]
        doc_id = f"ip_{ip_hash}"

        rate_limit_ref = self.db.collections["rate_limits"].document(doc_id)

        try:
            # Use transaction to ensure atomicity
            transaction = self.db.client.transaction()

            @firestore.transactional
            def update_in_transaction(transaction):
                doc = rate_limit_ref.get(transaction=transaction)

                if doc.exists:
                    data = doc.to_dict()
                    attempts = data.get("attempts", [])

                    # Filter out expired attempts
                    valid_attempts = [
                        ts for ts in attempts
                        if ts.replace(tzinfo=None) > window_start
                    ]

                    current_count = len(valid_attempts)

                    if current_count >= limit:
                        return False, 0

                    # Add current attempt
                    valid_attempts.append(now)

                    transaction.update(rate_limit_ref, {
                        "attempts": valid_attempts,
                        "lastAttempt": now,
                        "expiresAt": now + timedelta(seconds=window)
                    })

                    return True, limit - current_count - 1
                else:
                    # First attempt for this IP
                    transaction.set(rate_limit_ref, {
                        "attempts": [now],
                        "lastAttempt": now,
                        "expiresAt": now + timedelta(seconds=window),
                        "type": "ip"
                    })
                    return True, limit - 1

            return update_in_transaction(transaction)

        except Exception as e:
            # If Firestore fails, allow the request (fail open for availability)
            # Log the error for monitoring
            print(f"Rate limiter error for IP {ip_hash}: {e}")
            return True, limit

    def check_email_limit(self, email: str, limit: int = 3, window: int = 86400) -> Tuple[bool, int]:
        """
        Check email rate limit (3 per day default) using Firestore.

        Args:
            email: Email address to check
            limit: Maximum requests allowed in window
            window: Time window in seconds (86400 = 1 day)

        Returns:
            Tuple of (is_allowed, remaining_count)
        """
        # Normalize and hash email for privacy
        email_hash = hashlib.sha256(email.lower().strip().encode()).hexdigest()[:16]
        doc_id = f"email_{email_hash}"

        now = datetime.now()
        window_start = now - timedelta(seconds=window)

        rate_limit_ref = self.db.collections["rate_limits"].document(doc_id)

        try:
            # Use transaction to ensure atomicity
            transaction = self.db.client.transaction()

            @firestore.transactional
            def update_in_transaction(transaction):
                doc = rate_limit_ref.get(transaction=transaction)

                if doc.exists:
                    data = doc.to_dict()
                    attempts = data.get("attempts", [])

                    # Filter out expired attempts
                    valid_attempts = [
                        ts for ts in attempts
                        if ts.replace(tzinfo=None) > window_start
                    ]

                    current_count = len(valid_attempts)

                    if current_count >= limit:
                        return False, 0

                    # Add current attempt
                    valid_attempts.append(now)

                    transaction.update(rate_limit_ref, {
                        "attempts": valid_attempts,
                        "lastAttempt": now,
                        "expiresAt": now + timedelta(seconds=window)
                    })

                    return True, limit - current_count - 1
                else:
                    # First attempt for this email
                    transaction.set(rate_limit_ref, {
                        "attempts": [now],
                        "lastAttempt": now,
                        "expiresAt": now + timedelta(seconds=window),
                        "type": "email"
                    })
                    return True, limit - 1

            return update_in_transaction(transaction)

        except Exception as e:
            # If Firestore fails, allow the request (fail open for availability)
            print(f"Rate limiter error for email {email_hash}: {e}")
            return True, limit

    def check_global_limit(self, limit: int = 100) -> Tuple[bool, int]:
        """
        Check global rate limit (100 per minute default) using Firestore.

        Args:
            limit: Maximum requests allowed per minute

        Returns:
            Tuple of (is_allowed, remaining_count)
        """
        now = datetime.now()
        current_minute = now.replace(second=0, microsecond=0)
        doc_id = f"global_{current_minute.strftime('%Y%m%d_%H%M')}"

        rate_limit_ref = self.db.collections["rate_limits"].document(doc_id)

        try:
            # Use transaction to ensure atomicity
            transaction = self.db.client.transaction()

            @firestore.transactional
            def update_in_transaction(transaction):
                doc = rate_limit_ref.get(transaction=transaction)

                if doc.exists:
                    data = doc.to_dict()
                    count = data.get("count", 0)

                    if count >= limit:
                        return False, 0

                    transaction.update(rate_limit_ref, {
                        "count": firestore.Increment(1),
                        "lastAttempt": now
                    })

                    return True, limit - count - 1
                else:
                    # First request in this minute
                    transaction.set(rate_limit_ref, {
                        "count": 1,
                        "lastAttempt": now,
                        "expiresAt": current_minute + timedelta(minutes=2),
                        "type": "global"
                    })
                    return True, limit - 1

            return update_in_transaction(transaction)

        except Exception as e:
            # If Firestore fails, allow the request (fail open for availability)
            print(f"Rate limiter error for global limit: {e}")
            return True, limit

    def get_retry_after(self, window_type: str = "ip") -> int:
        """
        Get the number of seconds until rate limit resets.

        Args:
            window_type: Type of window ("ip", "email", or "global")

        Returns:
            Seconds until rate limit window resets
        """
        if window_type == "ip":
            return 3600  # 1 hour
        elif window_type == "email":
            return 86400  # 1 day
        else:
            # Global rate limit resets every minute
            now = datetime.now()
            seconds_into_minute = now.second
            return max(1, 60 - seconds_into_minute)


# Singleton instance for the application
rate_limiter = RateLimiter()