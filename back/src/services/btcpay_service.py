"""Service for BTCPay Server payment processing integration."""

import os
import hmac
import hashlib
import httpx
from typing import Optional
from src.util.logger import get_logger
from src.exceptions.CustomError import ExternalServiceError

logger = get_logger(__name__)


class BTCPayService:
    """Service for BTCPay Server API integration.

    Handles invoice creation, webhook verification, and Bitcoin/Lightning payment processing.
    """

    def __init__(self):
        """Initialize BTCPay service with environment configuration."""
        self.base_url = os.environ.get("BTCPAY_SERVER_URL")
        self.store_id = os.environ.get("BTCPAY_STORE_ID")
        self.api_key = os.environ.get("BTCPAY_API_KEY")
        self.webhook_secret = os.environ.get("BTCPAY_WEBHOOK_SECRET")

        if not self.base_url:
            raise ValueError("BTCPAY_SERVER_URL environment variable is required")

        if not self.store_id:
            raise ValueError("BTCPAY_STORE_ID environment variable is required")

        if not self.api_key:
            raise ValueError("BTCPAY_API_KEY environment variable is required")

        if not self.webhook_secret:
            raise ValueError("BTCPAY_WEBHOOK_SECRET environment variable is required")

        # Remove trailing slash from base URL if present
        self.base_url = self.base_url.rstrip('/')

    async def create_invoice(
        self,
        subscription_id: str,
        amount: float,
        currency: str = 'BRL',
        affiliate_id: Optional[str] = None
    ) -> str:
        """Create BTCPay Server invoice for Bitcoin/Lightning payment.

        Args:
            subscription_id: ID of the subscription being purchased
            amount: Amount in display currency (e.g., 300.00 for R$300)
            currency: Currency code (default: BRL)
            affiliate_id: Optional affiliate ID for commission tracking

        Returns:
            Invoice checkout URL to redirect customer

        Raises:
            ExternalServiceError: If BTCPay API request fails
        """
        url = f"{self.base_url}/api/v1/stores/{self.store_id}/invoices"

        headers = {
            'Authorization': f'token {self.api_key}',
            'Content-Type': 'application/json'
        }

        # Build metadata
        metadata = {
            'subscriptionId': subscription_id,
        }

        if affiliate_id:
            metadata['affiliateId'] = affiliate_id

        payload = {
            'amount': str(amount),  # Must be string in BTCPay API
            'currency': currency,
            'orderId': subscription_id,  # Important for tracking
            'metadata': metadata,
            'checkout': {
                'redirectURL': 'https://renato38.com.br/obrigado-compra',
                'speedPolicy': 'MediumSpeed',  # Wait for 1 confirmation
                'expirationMinutes': 15,
                'paymentMethods': ['BTC', 'BTC-LightningNetwork'],  # Both on-chain and Lightning
            }
        }

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    url,
                    json=payload,
                    headers=headers,
                    timeout=10.0
                )
                response.raise_for_status()
                invoice = response.json()

                logger.info(f"Created BTCPay invoice: {invoice.get('id')} for subscription {subscription_id}")

                return invoice['checkoutLink']

        except httpx.HTTPStatusError as e:
            logger.error(f"BTCPay API error creating invoice: {e.response.status_code} - {e.response.text}")
            raise ExternalServiceError(
                service="BTCPayServer",
                message=f"Failed to create invoice: {e.response.text}",
                details={"subscription_id": subscription_id, "status_code": e.response.status_code}
            )
        except httpx.TimeoutException:
            logger.error(f"BTCPay API timeout creating invoice for subscription {subscription_id}")
            raise ExternalServiceError(
                service="BTCPayServer",
                message="Request timeout",
                details={"subscription_id": subscription_id}
            )
        except Exception as e:
            logger.error(f"Unexpected error creating BTCPay invoice: {e}", exc_info=True)
            raise ExternalServiceError(
                service="BTCPayServer",
                message=f"Unexpected error: {str(e)}",
                details={"subscription_id": subscription_id}
            )

    def verify_webhook_signature(self, payload: str, signature: str) -> bool:
        """Verify BTCPay Server webhook signature.

        Args:
            payload: Raw webhook payload (string, not parsed JSON)
            signature: BTCPAY-SIG header value (format: sha256=<hex>)

        Returns:
            True if signature is valid, False otherwise
        """
        try:
            # Calculate expected signature
            expected = hmac.new(
                self.webhook_secret.encode('utf-8'),
                payload.encode('utf-8'),
                hashlib.sha256
            ).hexdigest()

            # Signature format: "sha256=<hex>"
            provided = signature.replace('sha256=', '') if signature.startswith('sha256=') else signature

            # Use timing-safe comparison to prevent timing attacks
            is_valid = hmac.compare_digest(expected, provided)

            if is_valid:
                logger.info("BTCPay webhook signature verified successfully")
            else:
                logger.warning("BTCPay webhook signature verification failed")

            return is_valid

        except Exception as e:
            logger.error(f"Error verifying BTCPay webhook signature: {e}", exc_info=True)
            return False

    async def get_invoice(self, invoice_id: str) -> dict:
        """Retrieve BTCPay Server invoice details.

        Args:
            invoice_id: Invoice ID

        Returns:
            Invoice data dictionary

        Raises:
            ExternalServiceError: If BTCPay API request fails
        """
        url = f"{self.base_url}/api/v1/stores/{self.store_id}/invoices/{invoice_id}"

        headers = {
            'Authorization': f'token {self.api_key}'
        }

        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(url, headers=headers, timeout=10.0)
                response.raise_for_status()
                return response.json()

        except httpx.HTTPStatusError as e:
            logger.error(f"BTCPay API error retrieving invoice: {e.response.status_code} - {e.response.text}")
            raise ExternalServiceError(
                service="BTCPayServer",
                message=f"Failed to retrieve invoice: {e.response.text}",
                details={"invoice_id": invoice_id, "status_code": e.response.status_code}
            )
        except httpx.TimeoutException:
            logger.error(f"BTCPay API timeout retrieving invoice {invoice_id}")
            raise ExternalServiceError(
                service="BTCPayServer",
                message="Request timeout",
                details={"invoice_id": invoice_id}
            )
