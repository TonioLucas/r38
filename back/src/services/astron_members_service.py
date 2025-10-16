"""Service for interacting with Astron Members API."""

import os
import requests
from typing import Optional, Dict, Any
from requests.auth import HTTPBasicAuth
from src.util.logger import get_logger
from src.exceptions.CustomError import ExternalServiceError

logger = get_logger(__name__)


class AstronMembersService:
    """Service for Astron Members API integration.

    Handles user creation, club membership, and magic login URLs.
    Uses Basic HTTP Auth with am_key and am_secret credentials.

    Note: API uses camelCase endpoint names (e.g., /listClubs, /setUser)
    not RESTful paths (e.g., /clubs, /users).
    """

    def __init__(self):
        """Initialize Astron Members service with proper authentication."""
        self.base_url = os.environ.get(
            "ASTRON_MEMBERS_API_URL",
            "https://api.astronmembers.com.br/v1.0"
        )
        self.am_key = os.environ.get("ASTRON_MEMBERS_AM_KEY")
        self.am_secret = os.environ.get("ASTRON_MEMBERS_AM_SECRET")

        if not self.am_key or not self.am_secret:
            raise ValueError(
                "ASTRON_MEMBERS_AM_KEY and ASTRON_MEMBERS_AM_SECRET "
                "environment variables are required"
            )

        # Use Basic HTTP Auth as per API documentation
        self.auth = HTTPBasicAuth(self.am_key, self.am_secret)

        # API uses urlencoded format for POST requests
        self.headers = {
            'Content-Type': 'application/x-www-form-urlencoded'
        }

        logger.info("Initialized Astron Members service with Basic Auth")

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
        # API uses camelCase: setClubUser endpoint
        url = f"{self.base_url}/setClubUser"

        # Use urlencoded format with auth credentials
        payload = {
            'am_key': self.am_key,
            'am_secret': self.am_secret,
            'clubId': club_id,
            'email': email,
            'nome': name,  # API uses Portuguese field names
            'password': password,
            'status': '1'  # 1 = active
        }

        try:
            response = requests.post(
                url,
                data=payload,  # urlencoded format
                auth=self.auth,
                headers=self.headers,
                timeout=10
            )

            # Check for application-level errors in response
            if response.status_code == 200:
                data = response.json()

                # API returns success:0/1 not HTTP status codes
                if data.get('success') == 0:
                    error_msg = data.get('error_message', 'Unknown error')
                    error_code = data.get('error_code')

                    # Handle user already exists
                    if 'already' in error_msg.lower() or 'existe' in error_msg.lower():
                        logger.warning(f"Astron user already exists: {email}")
                        existing_user = self.get_user_by_email(email, club_id)
                        if existing_user:
                            user_id = existing_user.get('id') or existing_user.get('userId')
                            if user_id:
                                return str(user_id)

                        raise ExternalServiceError(
                            service="Astron Members",
                            message=f"User exists but cannot retrieve ID: {email}",
                            details={"error_code": error_code, "error_message": error_msg}
                        )

                    raise ExternalServiceError(
                        service="Astron Members",
                        message=f"Failed to create user: {error_msg}",
                        details={"error_code": error_code, "error_message": error_msg}
                    )

                # Success
                result = data.get('return', {})
                user_id = result.get('id') or result.get('userId') or result.get('user_id')

                if not user_id:
                    logger.warning(f"No user ID in response for {email}: {data}")
                    # Fallback: try to get user
                    existing_user = self.get_user_by_email(email, club_id)
                    if existing_user:
                        user_id = existing_user.get('id')

                user_id_str = str(user_id) if user_id else email
                logger.info(f"Created Astron Members user: {user_id_str} for email: {email}")
                return user_id_str

            response.raise_for_status()
            return email  # Fallback

        except requests.exceptions.HTTPError as e:
            logger.error(f"Astron API HTTP error: {e.response.status_code}, {e.response.text}")
            raise ExternalServiceError(
                service="Astron Members",
                message=f"HTTP error creating user: {str(e)}",
                details={"status_code": e.response.status_code, "response": e.response.text}
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
        """Add existing Astron user to club.

        Args:
            astron_member_id: Existing user's Astron ID
            club_id: Club ID to add user to
            plan_id: Optional plan ID within the club

        Returns:
            API response data

        Raises:
            ExternalServiceError: If API request fails
        """
        # API uses: setClubUser (same endpoint as create)
        url = f"{self.base_url}/setClubUser"

        payload = {
            'am_key': self.am_key,
            'am_secret': self.am_secret,
            'clubId': club_id,
            'userId': astron_member_id,
            'status': '1'
        }

        if plan_id:
            payload['planId'] = plan_id

        try:
            response = requests.post(
                url,
                data=payload,
                auth=self.auth,
                headers=self.headers,
                timeout=10
            )

            if response.status_code == 200:
                data = response.json()

                if data.get('success') == 1:
                    logger.info(f"Added user {astron_member_id} to club {club_id}")
                    return data.get('return', {"success": True})

                error_msg = data.get('error_message', 'Unknown error')
                raise ExternalServiceError(
                    service="Astron Members",
                    message=f"Failed to add user to club: {error_msg}",
                    details={
                        "user_id": astron_member_id,
                        "club_id": club_id,
                        "error_code": data.get('error_code'),
                        "error_message": error_msg
                    }
                )

            response.raise_for_status()
            return {"success": True}

        except requests.exceptions.HTTPError as e:
            logger.error(f"HTTP error adding user to club: {e.response.status_code}, {e.response.text}")
            raise ExternalServiceError(
                service="Astron Members",
                message=f"HTTP error: {str(e)}",
                details={
                    "user_id": astron_member_id,
                    "club_id": club_id,
                    "status_code": e.response.status_code,
                    "response": e.response.text
                }
            )

        except requests.exceptions.RequestException as e:
            logger.error(f"Network error adding user to club: {e}", exc_info=True)
            raise ExternalServiceError(
                service="Astron Members",
                message=f"Network error: {str(e)}",
                details={"user_id": astron_member_id, "club_id": club_id}
            )

    def get_user_by_email(self, email: str, club_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """Get user by email address.

        Args:
            email: User email to search for
            club_id: Optional club ID to search within

        Returns:
            User data dict or None if not found
        """
        try:
            # API uses: getClubUser if club_id provided, otherwise listUsers
            if club_id:
                url = f"{self.base_url}/getClubUser"
                params = {
                    'am_key': self.am_key,
                    'am_secret': self.am_secret,
                    'clubId': club_id,
                    'email': email
                }
            else:
                url = f"{self.base_url}/listUsers"
                params = {
                    'am_key': self.am_key,
                    'am_secret': self.am_secret,
                    'email': email
                }

            response = requests.get(
                url,
                params=params,
                auth=self.auth,
                timeout=10
            )

            if response.status_code == 200:
                data = response.json()

                if data.get('success') == 0:
                    return None

                result = data.get('return', {})

                # For listUsers, result might have 'users' array
                if 'users' in result and isinstance(result['users'], list):
                    return result['users'][0] if result['users'] else None

                # For getClubUser, result is the user object
                if result and isinstance(result, dict):
                    return result

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
        # API uses: generateClubUserLoginUrl
        try:
            url = f"{self.base_url}/generateClubUserLoginUrl"

            payload = {
                'am_key': self.am_key,
                'am_secret': self.am_secret,
                'userId': astron_member_id,
                'email': email
            }

            response = requests.post(
                url,
                data=payload,
                auth=self.auth,
                headers=self.headers,
                timeout=10
            )

            if response.status_code == 200:
                data = response.json()
                if data.get('success') == 1:
                    result = data.get('return', {})
                    login_url = result.get('url') or result.get('login_url') or result.get('magic_link')

                    if login_url:
                        logger.info(f"Generated magic link via API for {astron_member_id}")
                        return login_url

        except requests.exceptions.RequestException as e:
            logger.info(f"Magic link API endpoint not available: {e}")

        # Fallback: Construct URL based on known patterns
        base_url = f"https://{club_subdomain}.astronmembers.com.br"
        magic_url = f"{base_url}/users/express_signin?email={email}"
        logger.info(f"Using fallback magic URL for {email}")
        return magic_url

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
            # API uses: getClubUser
            url = f"{self.base_url}/getClubUser"
            params = {
                'am_key': self.am_key,
                'am_secret': self.am_secret,
                'clubId': club_id,
                'userId': astron_member_id
            }

            response = requests.get(
                url,
                params=params,
                auth=self.auth,
                timeout=10
            )

            if response.status_code == 200:
                data = response.json()
                return data.get('success') == 1

            return False

        except requests.exceptions.RequestException as e:
            logger.error(f"Error verifying user access: {e}")
            return False
