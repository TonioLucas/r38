from datetime import datetime, timedelta
from typing import Dict, List, Tuple
import hashlib


class RateLimiter:
    """Rate limiter for preventing abuse of public endpoints."""

    def __init__(self):
        self.ip_limits: Dict[str, List[Tuple[datetime, int]]] = {}
        self.email_limits: Dict[str, List[Tuple[datetime, int]]] = {}
        self.global_count = 0
        self.global_minute_start = datetime.now()

    def check_ip_limit(self, ip: str, limit: int = 10, window: int = 3600) -> Tuple[bool, int]:
        """
        Check IP rate limit (10 per hour default).

        Args:
            ip: IP address to check
            limit: Maximum requests allowed in window
            window: Time window in seconds

        Returns:
            Tuple of (is_allowed, remaining_count)
        """
        now = datetime.now()
        window_start = now - timedelta(seconds=window)

        # Clean old entries and count recent
        if ip not in self.ip_limits:
            self.ip_limits[ip] = []

        # Filter out old entries
        self.ip_limits[ip] = [
            (ts, count) for ts, count in self.ip_limits[ip]
            if ts > window_start
        ]

        # Count requests in window
        current_count = sum(count for _, count in self.ip_limits[ip])

        if current_count >= limit:
            return False, 0

        # Add current request
        self.ip_limits[ip].append((now, 1))

        return True, limit - current_count - 1

    def check_email_limit(self, email: str, limit: int = 3, window: int = 86400) -> Tuple[bool, int]:
        """
        Check email rate limit (3 per day default).

        Args:
            email: Email address to check
            limit: Maximum requests allowed in window
            window: Time window in seconds (86400 = 1 day)

        Returns:
            Tuple of (is_allowed, remaining_count)
        """
        # Normalize email
        email_hash = hashlib.sha256(email.lower().strip().encode()).hexdigest()

        now = datetime.now()
        window_start = now - timedelta(seconds=window)

        # Clean old entries and count recent
        if email_hash not in self.email_limits:
            self.email_limits[email_hash] = []

        # Filter out old entries
        self.email_limits[email_hash] = [
            (ts, count) for ts, count in self.email_limits[email_hash]
            if ts > window_start
        ]

        # Count requests in window
        current_count = sum(count for _, count in self.email_limits[email_hash])

        if current_count >= limit:
            return False, 0

        # Add current request
        self.email_limits[email_hash].append((now, 1))

        return True, limit - current_count - 1

    def check_global_limit(self, limit: int = 100) -> Tuple[bool, int]:
        """
        Check global rate limit (100 per minute default).

        Args:
            limit: Maximum requests allowed per minute

        Returns:
            Tuple of (is_allowed, remaining_count)
        """
        now = datetime.now()

        # Reset counter every minute
        if (now - self.global_minute_start).seconds >= 60:
            self.global_count = 0
            self.global_minute_start = now

        if self.global_count >= limit:
            return False, 0

        self.global_count += 1

        return True, limit - self.global_count

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
            seconds_elapsed = (now - self.global_minute_start).seconds
            return max(1, 60 - seconds_elapsed)


# Singleton instance for the application
rate_limiter = RateLimiter()