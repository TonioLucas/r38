"""Service for interacting with dub.co API."""

import os
from typing import Optional, Dict, Any
from dub import Dub
from dub.models import errors
from src.util.logger import get_logger
from src.exceptions.CustomError import ExternalServiceError

logger = get_logger(__name__)


class DubService:
    """Service for interacting with dub.co API."""

    def __init__(self):
        """Initialize dub.co service."""
        self.api_key = os.environ.get("DUB_API_KEY")

        if not self.api_key:
            raise ValueError("DUB_API_KEY environment variable is required")

        # Initialize SDK
        self.client = Dub(token=self.api_key)
        logger.info("Initialized dub.co service")

    def track_lead(
        self,
        click_id: str,
        customer_id: str,
        email: str,
        name: Optional[str] = None
    ) -> Dict[str, Any]:
        """Track lead conversion event.

        Args:
            click_id: The dub_id from cookie
            customer_id: Firebase UID
            email: Customer email
            name: Customer name

        Returns:
            API response with click and customer data
        """
        try:
            result = self.client.track.lead(
                click_id=click_id,
                event_name="Sign Up",
                customer_external_id=customer_id,
                customer_email=email,
                customer_name=name
            )

            logger.info(f"Tracked lead for customer {customer_id}")
            return result.dict() if hasattr(result, 'dict') else result

        except errors.SDKError as e:
            logger.error(f"dub.co API error tracking lead: {e}")
            raise ExternalServiceError(
                service="dub.co",
                message=f"Failed to track lead: {str(e)}",
                details={"customer_id": customer_id}
            )
        except Exception as e:
            logger.error(f"Unexpected error tracking lead: {e}", exc_info=True)
            raise

    def track_sale(
        self,
        customer_id: str,
        amount: int,
        currency: str = "BRL",
        invoice_id: Optional[str] = None,
        event_name: str = "Purchase"
    ) -> Dict[str, Any]:
        """Track sale conversion event.

        Args:
            customer_id: Firebase UID
            amount: Amount in cents
            currency: ISO currency code
            invoice_id: Optional invoice/order ID
            event_name: Event name for tracking

        Returns:
            API response with conversion data
        """
        try:
            result = self.client.track.sale(
                customer_external_id=customer_id,
                amount=amount,
                currency=currency,
                event_name=event_name,
                payment_processor="stripe",
                invoice_id=invoice_id
            )

            logger.info(f"Tracked sale for customer {customer_id}, amount: {amount}")
            return result.dict() if hasattr(result, 'dict') else result

        except errors.SDKError as e:
            logger.error(f"dub.co API error tracking sale: {e}")
            # Don't fail payment if tracking fails
            return {"error": str(e), "tracked": False}
        except Exception as e:
            logger.error(f"Unexpected error tracking sale: {e}", exc_info=True)
            return {"error": str(e), "tracked": False}

    def create_partner_link(
        self,
        partner_id: str,
        url: str,
        program_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Create a partner tracking link.

        Args:
            partner_id: Partner identifier
            url: Target URL
            program_id: Optional program ID

        Returns:
            Link data with short URL
        """
        try:
            result = self.client.links.create(
                url=url,
                external_id=f"partner_{partner_id}",
                track_conversion=True,
                tags=[partner_id]
            )

            logger.info(f"Created partner link for {partner_id}")
            return result.dict() if hasattr(result, 'dict') else result

        except errors.SDKError as e:
            logger.error(f"dub.co API error creating link: {e}")
            raise ExternalServiceError(
                service="dub.co",
                message=f"Failed to create partner link: {str(e)}",
                details={"partner_id": partner_id}
            )

    def verify_webhook_signature(
        self,
        payload: str,
        signature: str
    ) -> bool:
        """Verify webhook signature using HMAC-SHA256.

        Args:
            payload: Raw request body
            signature: X-Dub-Signature header value

        Returns:
            True if signature is valid
        """
        import hmac
        import hashlib

        secret = os.environ.get('DUB_WEBHOOK_SECRET')
        if not secret:
            logger.error("DUB_WEBHOOK_SECRET not configured")
            return False

        expected = hmac.new(
            secret.encode('utf-8'),
            payload.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()

        return hmac.compare_digest(signature, expected)