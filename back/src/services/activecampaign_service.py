"""Service for ActiveCampaign API v3 integration."""

import os
import time
import requests
from typing import Dict, Any, Optional
from src.util.logger import get_logger
from src.exceptions.CustomError import ExternalServiceError
from src.models.activecampaign_types import (
    SyncContactRequest,
    SyncContactResponse,
    AddTagRequest,
)

logger = get_logger(__name__)


class ActiveCampaignService:
    """Service for ActiveCampaign API v3 integration.

    Handles contact synchronization and tagging for lead automation.
    Implements rate limiting to respect ActiveCampaign's 5 req/sec limit.
    """

    def __init__(self):
        """Initialize ActiveCampaign service with environment configuration."""
        account = os.environ.get("ACTIVECAMPAIGN_ACCOUNT")
        self.api_key = os.environ.get("ACTIVECAMPAIGN_API_KEY")
        self.ebook_tag_name = os.environ.get("ACTIVECAMPAIGN_EBOOK_TAG", "Ebook Downloaded")
        self.ebook_list_name = os.environ.get("ACTIVECAMPAIGN_EBOOK_LIST")
        self.download_field_id = os.environ.get("ACTIVECAMPAIGN_DOWNLOAD_FIELD_ID")

        if not account or not self.api_key:
            raise ValueError("ActiveCampaign credentials not configured")

        if not self.ebook_list_name:
            raise ValueError("ACTIVECAMPAIGN_EBOOK_LIST environment variable is required")

        if not self.download_field_id:
            raise ValueError("ACTIVECAMPAIGN_DOWNLOAD_FIELD_ID environment variable is required")

        # Support both formats: "renato38.activehosted.com" or "renato38"
        # The URL from ActiveCampaign dashboard is the source of truth
        if "." in account:
            # Full URL provided (e.g., "renato38.activehosted.com")
            self.base_url = f"https://{account}/api/3"
        else:
            # Legacy format: just account name (defaults to api-us1.com)
            self.base_url = f"https://{account}.api-us1.com/api/3"
        self.headers = {
            "Api-Token": self.api_key,
            "Content-Type": "application/json"
        }
        self.last_request_time = 0

    def _rate_limit(self):
        """Ensure 200ms between requests (4 req/sec, conservative).

        ActiveCampaign limits to 5 req/sec, so we use 200ms (4 req/sec)
        to provide a safety margin.
        """
        elapsed = time.time() - self.last_request_time
        if elapsed < 0.2:
            time.sleep(0.2 - elapsed)
        self.last_request_time = time.time()

    def _request(self, method: str, endpoint: str, data: Optional[Dict] = None) -> Dict[str, Any]:
        """Make API request with error handling and rate limiting.

        Args:
            method: HTTP method (GET, POST, etc.)
            endpoint: API endpoint path (e.g., "/contact/sync")
            data: Optional request body data

        Returns:
            Response JSON data

        Raises:
            ExternalServiceError: If the API request fails
        """
        self._rate_limit()

        url = f"{self.base_url}{endpoint}"

        try:
            response = requests.request(
                method=method,
                url=url,
                headers=self.headers,
                json=data,
                timeout=10
            )
            response.raise_for_status()
            return response.json()

        except requests.exceptions.Timeout:
            logger.error(f"ActiveCampaign API timeout: {endpoint}")
            raise ExternalServiceError(
                service="ActiveCampaign",
                message="Request timeout",
                status_code=None
            )

        except requests.exceptions.HTTPError as e:
            logger.error(f"ActiveCampaign HTTP error: {e.response.status_code} - {e.response.text}")
            raise ExternalServiceError(
                service="ActiveCampaign",
                message=f"API error: {e.response.text}",
                status_code=e.response.status_code
            )

        except requests.exceptions.RequestException as e:
            logger.error(f"ActiveCampaign request failed: {e}")
            raise ExternalServiceError(
                service="ActiveCampaign",
                message=f"Request failed: {str(e)}",
                status_code=None
            )

    def sync_contact(self, email: str, first_name: str = "", last_name: str = "", phone: str = "", download_link: str = "") -> str:
        """Sync (create or update) contact in ActiveCampaign with custom fields.

        Uses the /contact/sync endpoint which handles both create and update
        operations based on the email address (upsert).

        Args:
            email: Contact email address (required)
            first_name: Contact first name
            last_name: Contact last name
            phone: Contact phone number in E.164 format (e.g., +5511988887777)
            download_link: Download URL for the ebook (stored in custom field)

        Returns:
            Contact ID (string) from ActiveCampaign
        """
        request_data: SyncContactRequest = {
            "contact": {
                "email": email,
                "firstName": first_name,
                "lastName": last_name,
                "phone": phone
            }
        }

        # Add custom field for download link if provided
        if download_link:
            request_data["contact"]["fieldValues"] = [
                {
                    "field": self.download_field_id,
                    "value": download_link
                }
            ]

        response: SyncContactResponse = self._request("POST", "/contact/sync", request_data)
        contact_id = response["contact"]["id"]

        logger.info(f"ActiveCampaign contact synced: {email} (ID: {contact_id})")
        return contact_id

    def get_tag_id(self, tag_name: str) -> Optional[str]:
        """Get tag ID by tag name.

        Args:
            tag_name: Name of the tag to find

        Returns:
            Tag ID (string) if found, None otherwise
        """
        response = self._request("GET", "/tags")
        tags = response.get("tags", [])

        for tag in tags:
            if tag["tag"].lower() == tag_name.lower():
                return tag["id"]

        return None

    def get_tag_id_by_name(self, tag_name: str) -> str:
        """Get tag ID by tag name, raising error if not found.

        Note: Tag must exist in ActiveCampaign (created via dashboard).
        This method does NOT create tags automatically.

        Args:
            tag_name: Name of the tag to find

        Returns:
            Tag ID (string)

        Raises:
            ValueError: If tag doesn't exist
        """
        tag_id = self.get_tag_id(tag_name)

        if not tag_id:
            raise ValueError(
                f"Tag '{tag_name}' not found in ActiveCampaign. "
                f"Please create it in the dashboard."
            )

        return tag_id

    def get_list_id(self, list_name: str) -> Optional[str]:
        """Get list ID by list name.

        Args:
            list_name: Name of the list to find

        Returns:
            List ID (string) if found, None otherwise
        """
        response = self._request("GET", "/lists")
        lists = response.get("lists", [])

        for list_item in lists:
            if list_item["name"].lower() == list_name.lower():
                return list_item["id"]

        return None

    def get_list_id_by_name(self, list_name: str) -> str:
        """Get list ID by list name, raising error if not found.

        Note: List must exist in ActiveCampaign (created via dashboard).
        This method does NOT create lists automatically.

        Args:
            list_name: Name of the list to find

        Returns:
            List ID (string)

        Raises:
            ValueError: If list doesn't exist
        """
        list_id = self.get_list_id(list_name)

        if not list_id:
            raise ValueError(
                f"List '{list_name}' not found in ActiveCampaign. "
                f"Please create it in the dashboard."
            )

        return list_id

    def add_contact_to_list(self, contact_id: str, list_id: str) -> bool:
        """Add contact to a list with active/subscribed status.

        Args:
            contact_id: ActiveCampaign contact ID (from sync_contact)
            list_id: ActiveCampaign list ID (from get_list_id)

        Returns:
            True if successful
        """
        request_data = {
            "contactList": {
                "contact": contact_id,
                "list": list_id,
                "status": 1  # 1 = Active/Subscribed, 2 = Unsubscribed
            }
        }

        self._request("POST", "/contactLists", request_data)
        logger.info(f"Contact {contact_id} added to list {list_id}")
        return True

    def add_tag_to_contact(self, contact_id: str, tag_id: str) -> bool:
        """Add tag to contact.

        Args:
            contact_id: ActiveCampaign contact ID (from sync_contact)
            tag_id: ActiveCampaign tag ID (from get_tag_id)

        Returns:
            True if successful
        """
        request_data: AddTagRequest = {
            "contactTag": {
                "contact": contact_id,
                "tag": tag_id
            }
        }

        self._request("POST", "/contactTags", request_data)
        logger.info(f"Tag {tag_id} added to contact {contact_id}")
        return True

    def process_lead(self, email: str, name: str, phone: str = "", download_link: str = "") -> Dict[str, Any]:
        """Complete lead processing workflow with download link.

        This is the main method to call from create_lead.py.

        Workflow:
        1. Sync contact (create or update) with download link custom field
        2. Add contact to list (required)
        3. Get ebook tag ID (must already exist)
        4. Add tag to contact (triggers automation)

        Args:
            email: Lead email address
            name: Lead full name
            phone: Lead phone number in E.164 format
            download_link: Download URL for the ebook (stored in custom field)

        Returns:
            Dict with:
            - success: bool (True if all steps completed)
            - contact_id: str (ActiveCampaign contact ID to store in Firestore)
            - list_id: str (ActiveCampaign list ID)
            - tag_id: str (ActiveCampaign tag ID)
        """
        # Parse name into first/last
        name_parts = name.split(maxsplit=1)
        first_name = name_parts[0] if name_parts else ""
        last_name = name_parts[1] if len(name_parts) > 1 else ""

        # Step 1: Sync contact with download link
        contact_id = self.sync_contact(
            email=email,
            first_name=first_name,
            last_name=last_name,
            phone=phone,
            download_link=download_link
        )

        # Step 2: Add to list (required)
        list_id = self.get_list_id_by_name(self.ebook_list_name)
        self.add_contact_to_list(contact_id, list_id)

        # Step 3: Get tag ID (tag must already exist in ActiveCampaign)
        tag_id = self.get_tag_id_by_name(self.ebook_tag_name)

        # Step 4: Add tag to contact (triggers automation)
        self.add_tag_to_contact(contact_id, tag_id)

        return {
            "success": True,
            "contact_id": contact_id,  # Store this in Firestore lead document
            "list_id": list_id,
            "tag_id": tag_id
        }

    def sync_customer_purchase(
        self,
        email: str,
        name: str,
        product_name: str,
        support_expires_at: str,
        mentorship_included: bool,
        generated_password: str,
        magic_login_url: str
    ) -> Dict[str, Any]:
        """Sync customer purchase data and trigger welcome email.

        Args:
            email: Customer email
            name: Customer name
            product_name: Name of purchased product
            support_expires_at: Support expiration date
            mentorship_included: Whether mentorship is included
            generated_password: Generated password for customer
            magic_login_url: Magic login URL for Astron Members

        Returns:
            Dict with success status and contact ID
        """
        try:
            # Parse name
            name_parts = name.split(maxsplit=1)
            first_name = name_parts[0] if name_parts else ""
            last_name = name_parts[1] if len(name_parts) > 1 else ""

            # Find or create contact
            contact = self.find_or_create_contact(email, first_name, last_name)
            contact_id = contact['id']

            # Update custom fields with purchase data
            custom_fields = {
                'subscription_status': 'active',
                'product_purchased': product_name,
                'support_expires_at': support_expires_at,
                'mentorship_included': 'yes' if mentorship_included else 'no',
                'generated_password': generated_password,
                'magic_login_url': magic_login_url
            }

            # Update contact fields
            self.update_contact_fields(contact_id, custom_fields)

            # Add purchase tag
            purchase_tag = f"Purchased_{product_name.replace(' ', '_')}"
            purchase_tag_id = self.get_or_create_tag(purchase_tag)
            self.add_tag_to_contact(contact_id, purchase_tag_id)

            # Add Customer tag
            customer_tag_id = self.get_or_create_tag("Customer")
            self.add_tag_to_contact(contact_id, customer_tag_id)

            # Remove Lead tag if exists
            try:
                lead_tag_id = self.get_tag_id_by_name("Lead")
                if lead_tag_id:
                    self.remove_tag_from_contact(contact_id, lead_tag_id)
            except Exception:
                pass  # Lead tag might not exist

            # Trigger welcome email automation
            welcome_tag_id = self.get_or_create_tag("Trigger_Welcome_Email")
            self.add_tag_to_contact(contact_id, welcome_tag_id)

            logger.info(f"Customer purchase synced for {email}")

            return {
                "success": True,
                "contact_id": contact_id
            }

        except Exception as e:
            logger.error(f"Failed to sync customer purchase: {e}", exc_info=True)
            return {
                "success": False,
                "error": str(e)
            }

    def find_or_create_contact(self, email: str, first_name: str, last_name: str) -> Dict[str, Any]:
        """Find existing contact or create new one.

        Args:
            email: Contact email
            first_name: Contact first name
            last_name: Contact last name

        Returns:
            Contact data dict
        """
        # Search for existing contact by email
        response = self._request("GET", f"/contacts?email={email}")

        if response.get('contacts'):
            # Contact exists, return it
            return response['contacts'][0]

        # Create new contact
        contact_data = {
            "contact": {
                "email": email,
                "firstName": first_name,
                "lastName": last_name
            }
        }

        result = self._request("POST", "/contacts", contact_data)
        return result['contact']

    def update_contact_fields(self, contact_id: str, fields: Dict[str, Any]) -> bool:
        """Update contact custom fields.

        Args:
            contact_id: ActiveCampaign contact ID
            fields: Dict of field names and values

        Returns:
            True if successful
        """
        # First get custom field IDs
        field_values = []

        for field_name, value in fields.items():
            # Get field ID by name (or create if doesn't exist)
            field_id = self.get_or_create_custom_field(field_name)
            field_values.append({
                "field": field_id,
                "value": str(value)
            })

        # Update contact with field values
        contact_data = {
            "contact": {
                "fieldValues": field_values
            }
        }

        self._request("PUT", f"/contacts/{contact_id}", contact_data)
        logger.info(f"Updated {len(fields)} fields for contact {contact_id}")
        return True

    def get_or_create_custom_field(self, field_name: str) -> str:
        """Get custom field ID or create if doesn't exist.

        Args:
            field_name: Name of the custom field

        Returns:
            Field ID
        """
        # Try to get existing field
        response = self._request("GET", "/fields")

        for field in response.get('fields', []):
            if field['title'].lower() == field_name.lower():
                return field['id']

        # Create new field
        field_data = {
            "field": {
                "type": "text",
                "title": field_name,
                "descript": f"Auto-created field: {field_name}",
                "visible": 1
            }
        }

        result = self._request("POST", "/fields", field_data)
        return result['field']['id']

    def get_or_create_tag(self, tag_name: str) -> str:
        """Get tag ID or create if doesn't exist.

        Args:
            tag_name: Name of the tag

        Returns:
            Tag ID
        """
        try:
            # Try to get existing tag
            return self.get_tag_id_by_name(tag_name)
        except Exception:
            # Create new tag
            tag_data = {
                "tag": {
                    "tag": tag_name,
                    "tagType": "contact",
                    "description": f"Auto-created tag: {tag_name}"
                }
            }

            result = self._request("POST", "/tags", tag_data)
            return result['tag']['id']

    def remove_tag_from_contact(self, contact_id: str, tag_id: str) -> bool:
        """Remove tag from contact.

        Args:
            contact_id: ActiveCampaign contact ID
            tag_id: ActiveCampaign tag ID

        Returns:
            True if successful
        """
        try:
            # First get the contactTag association ID
            response = self._request("GET", f"/contacts/{contact_id}/contactTags")

            for contact_tag in response.get('contactTags', []):
                if contact_tag['tag'] == tag_id:
                    # Delete the association
                    self._request("DELETE", f"/contactTags/{contact_tag['id']}")
                    logger.info(f"Removed tag {tag_id} from contact {contact_id}")
                    return True

            return False

        except Exception as e:
            logger.error(f"Failed to remove tag: {e}")
            return False
