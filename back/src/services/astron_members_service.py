"""Service for interacting with Astron Members API."""

import os
import requests
from typing import Optional, Dict, Any
from src.util.logger import get_logger
from src.exceptions.CustomError import ExternalServiceError

logger = get_logger(__name__)


class AstronMembersService:
    """Service for Astron Members API integration.

    Handles user creation, club membership, and magic login URLs.
    """

    def __init__(self):
        """Initialize Astron Members service."""
        self.base_url = os.environ.get("ASTRON_MEMBERS_API_URL", "https://api.astronmembers.com.br")
        self.api_token = os.environ.get("ASTRON_MEMBERS_API_TOKEN")

        if not self.api_token:
            raise ValueError("ASTRON_MEMBERS_API_TOKEN environment variable is required")

        self.headers = {
            'Authorization': f'Bearer {self.api_token}',
            'Content-Type': 'application/json'
        }

        logger.info("Initialized Astron Members service")

    def create_user(
        self,
        email: str,
        name: str,
        password: str,
        club_id: str
    ) -> str:
        """Create Astron Members user and add to club.

        Args:
            email: User email
            name: User full name
            password: User password
            club_id: Club ID to add user to

        Returns:
            Astron member ID

        Raises:
            ExternalServiceError: If API request fails
        """
        url = f"{self.base_url}/clubs/{club_id}/users"

        payload = {
            'email': email,
            'name': name,
            'password': password,
            'status': 'active'
        }

        try:
            response = requests.post(url, json=payload, headers=self.headers, timeout=10)
            response.raise_for_status()

            user_data = response.json()
            astron_member_id = user_data.get('id') or user_data.get('user_id')

            logger.info(f"Created Astron Members user: {astron_member_id} for email: {email}")
            return astron_member_id

        except requests.exceptions.HTTPError as e:
            if e.response.status_code == 409:
                # User already exists, try to get existing ID
                logger.warning(f"Astron user already exists: {email}")
                existing_user = self.get_user_by_email(email)
                if existing_user:
                    # Add existing user to club
                    self.add_user_to_club(existing_user['id'], club_id)
                    return existing_user['id']
                raise ExternalServiceError(
                    service="Astron Members",
                    message=f"User exists but cannot retrieve ID: {email}",
                    details={"status_code": 409}
                )

            logger.error(f"Astron API error: {e.response.status_code}, {e.response.text}")
            raise ExternalServiceError(
                service="Astron Members",
                message=f"Failed to create user: {str(e)}",
                details={"status_code": e.response.status_code}
            )

        except requests.exceptions.RequestException as e:
            logger.error(f"Network error calling Astron API: {e}", exc_info=True)
            raise ExternalServiceError(
                service="Astron Members",
                message=f"Network error: {str(e)}",
                details={"email": email}
            )

    def add_user_to_club(
        self,
        astron_member_id: str,
        club_id: str,
        plan_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Add existing Astron user to new club/plan.

        Args:
            astron_member_id: Existing user's Astron ID
            club_id: Club ID to add user to
            plan_id: Optional plan ID within the club

        Returns:
            API response data

        Raises:
            ExternalServiceError: If API request fails
        """
        # Try different endpoint variations as Astron API may vary
        endpoints = [
            f"{self.base_url}/users/{astron_member_id}/plans",
            f"{self.base_url}/clubs/{club_id}/addUser",
            f"{self.base_url}/clubs/{club_id}/users/{astron_member_id}"
        ]

        for endpoint in endpoints:
            try:
                payload = {
                    'user_id': astron_member_id,
                    'club_id': club_id
                }

                if plan_id:
                    payload['plan_id'] = plan_id

                response = requests.post(endpoint, json=payload, headers=self.headers, timeout=10)

                if response.status_code in [200, 201, 204]:
                    logger.info(f"Added user {astron_member_id} to club {club_id}")
                    return response.json() if response.text else {"success": True}

            except requests.exceptions.RequestException:
                continue

        # If all endpoints fail, raise error
        raise ExternalServiceError(
            service="Astron Members",
            message="Failed to add user to club - all endpoints failed",
            details={"user_id": astron_member_id, "club_id": club_id}
        )

    def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """Get user by email address.

        Args:
            email: User email to search for

        Returns:
            User data dict or None if not found
        """
        try:
            url = f"{self.base_url}/users"
            params = {'email': email}

            response = requests.get(url, params=params, headers=self.headers, timeout=10)

            if response.status_code == 404:
                return None

            response.raise_for_status()

            data = response.json()

            # Response might be a list or single object
            if isinstance(data, list):
                return data[0] if data else None
            elif isinstance(data, dict):
                if 'users' in data:
                    return data['users'][0] if data['users'] else None
                return data

            return None

        except requests.exceptions.RequestException as e:
            logger.error(f"Error getting user by email: {e}")
            return None

    def generate_magic_login_url(
        self,
        astron_member_id: str,
        email: str,
        club_subdomain: str = "renato38"
    ) -> str:
        """Generate magic login URL for user.

        Args:
            astron_member_id: User's Astron ID
            email: User's email
            club_subdomain: Club subdomain (default: renato38)

        Returns:
            Magic login URL
        """
        # First try to get magic link from API if available
        try:
            url = f"{self.base_url}/users/{astron_member_id}/magic-link"

            response = requests.post(
                url,
                json={'redirect_to': f'https://{club_subdomain}.astronmembers.com.br/'},
                headers=self.headers,
                timeout=10
            )

            if response.status_code == 200:
                data = response.json()
                if 'magic_link' in data:
                    return data['magic_link']
                if 'url' in data:
                    return data['url']

        except requests.exceptions.RequestException:
            logger.info("Magic link API not available, constructing URL")

        # Fallback: Construct URL based on known patterns
        # Option 1: Email-based express login
        base_url = f"https://{club_subdomain}.astronmembers.com.br"
        return f"{base_url}/users/express_signin?email={email}"

    def verify_user_access(
        self,
        astron_member_id: str,
        club_id: str
    ) -> bool:
        """Verify if user has access to a specific club.

        Args:
            astron_member_id: User's Astron ID
            club_id: Club ID to check

        Returns:
            True if user has access, False otherwise
        """
        try:
            url = f"{self.base_url}/users/{astron_member_id}/clubs"

            response = requests.get(url, headers=self.headers, timeout=10)

            if response.status_code != 200:
                return False

            clubs = response.json()

            # Check if club_id is in user's clubs
            if isinstance(clubs, list):
                return any(club.get('id') == club_id for club in clubs)
            elif isinstance(clubs, dict) and 'clubs' in clubs:
                return any(club.get('id') == club_id for club in clubs['clubs'])

            return False

        except requests.exceptions.RequestException as e:
            logger.error(f"Error verifying user access: {e}")
            return False