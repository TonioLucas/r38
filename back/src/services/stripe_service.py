"""Service for Stripe payment processing integration."""

import os
import time
import stripe
from typing import Optional
from src.documents.products.Product import Product
from src.documents.products.ProductPrice import ProductPrice
from src.documents.customers.Subscription import Subscription
from src.util.logger import get_logger
from src.exceptions.CustomError import ExternalServiceError

logger = get_logger(__name__)


class StripeService:
    """Service for Stripe API integration.

    Handles Checkout Session creation, webhook verification, and payment processing.
    """

    def __init__(self):
        """Initialize Stripe service with environment configuration."""
        self.api_key = os.environ.get("STRIPE_SECRET_KEY")
        self.webhook_secret = os.environ.get("STRIPE_WEBHOOK_SECRET")

        if not self.api_key:
            raise ValueError("STRIPE_SECRET_KEY environment variable is required")

        if not self.webhook_secret:
            raise ValueError("STRIPE_WEBHOOK_SECRET environment variable is required")

        # Set Stripe API key globally
        stripe.api_key = self.api_key

    def create_checkout_session(
        self,
        subscription_id: str,
        product: Product,
        price: ProductPrice,
        affiliate_id: Optional[str] = None
    ) -> str:
        """Create Stripe Checkout Session for payment.

        Args:
            subscription_id: ID of the subscription being purchased
            product: Product document
            price: ProductPrice document
            affiliate_id: Optional affiliate ID for commission tracking

        Returns:
            Checkout session URL to redirect customer

        Raises:
            ExternalServiceError: If Stripe API request fails
        """
        try:
            # Get customer ID from subscription
            subscription = Subscription(id=subscription_id)
            if not subscription.doc:
                raise ValueError(f"Subscription {subscription_id} not found")

            customer_id = subscription.doc.customer_id

            # Get customer data for prefilling
            from src.documents.customers.Customer import Customer
            customer = Customer(id=customer_id)
            if not customer.doc:
                raise ValueError(f"Customer {customer_id} not found")

            # Build metadata
            metadata = {
                'subscription_id': subscription_id,
                'product_id': product.doc.id,
                'price_id': price.doc.id,
                'dubCustomerId': customer_id,  # Add for dub.co affiliate tracking
            }

            if affiliate_id:
                metadata['affiliate_id'] = affiliate_id

            # Create Checkout Session
            session = stripe.checkout.Session.create(
                mode='payment',  # One-time payment, not recurring
                payment_method_types=['card'],  # PIX temporarily paused - coming soon
                customer_email=customer.doc.email,  # Prefill email
                line_items=[{
                    'price_data': {
                        'currency': price.doc.currency.lower(),
                        'unit_amount': price.doc.amount,  # Amount in centavos
                        'product_data': {
                            'name': product.doc.name,
                            'description': product.doc.description,
                        },
                    },
                    'quantity': 1,
                }],
                success_url='https://renato38.com.br/obrigado-compra?session_id={CHECKOUT_SESSION_ID}',
                cancel_url='https://renato38.com.br/produtos?cancelled=true',
                metadata=metadata,
                expires_at=int(time.time()) + (30 * 60),  # Expires in 30 minutes
                locale='pt-BR',  # Brazilian Portuguese
                phone_number_collection={'enabled': True},  # Collect phone number
            )

            logger.info(f"Created Stripe Checkout Session: {session.id} for subscription {subscription_id}")

            return session.url

        except Exception as stripe_error:
            # Handle Stripe errors (works with both old and new stripe library versions)
            if 'stripe' in str(type(stripe_error).__module__):
                logger.error(f"Stripe API error creating checkout session: {stripe_error}")
                raise ExternalServiceError(
                    service="Stripe",
                    message=f"Failed to create checkout session: {str(stripe_error)}",
                    details={"subscription_id": subscription_id}
                )
            # Re-raise non-Stripe exceptions
            raise
        except Exception as e:
            logger.error(f"Unexpected error creating checkout session: {e}", exc_info=True)
            raise ExternalServiceError(
                service="Stripe",
                message=f"Unexpected error: {str(e)}",
                details={"subscription_id": subscription_id}
            )

    def verify_webhook_signature(self, payload: str, sig_header: str) -> dict:
        """Verify Stripe webhook signature and return event.

        Args:
            payload: Raw webhook payload (string, not parsed JSON)
            sig_header: Stripe-Signature header value

        Returns:
            Stripe event dictionary

        Raises:
            ValueError: If signature verification fails or payload is invalid
        """
        try:
            # Stripe library verifies signature and parses JSON internally
            event = stripe.Webhook.construct_event(
                payload,
                sig_header,
                self.webhook_secret
            )

            logger.info(f"Verified Stripe webhook: {event['type']}, ID: {event['id']}")

            return event

        except ValueError as e:
            # Invalid payload
            logger.error(f"Invalid Stripe webhook payload: {e}")
            raise ValueError(f"Invalid payload: {str(e)}")

        except Exception as e:
            # Invalid signature (works with both old and new stripe library)
            if 'SignatureVerificationError' in str(type(e).__name__):
                logger.error(f"Invalid Stripe webhook signature: {e}")
                raise ValueError(f"Invalid signature: {str(e)}")
            raise

    def get_session(self, session_id: str) -> dict:
        """Retrieve Stripe Checkout Session details.

        Args:
            session_id: Checkout Session ID

        Returns:
            Session data dictionary

        Raises:
            ExternalServiceError: If Stripe API request fails
        """
        try:
            session = stripe.checkout.Session.retrieve(session_id)

            return {
                'id': session.id,
                'payment_status': session.payment_status,
                'amount_total': session.amount_total,
                'currency': session.currency,
                'customer_email': session.customer_details.get('email') if session.customer_details else None,
                'metadata': session.metadata,
            }

        except Exception as e:
            # Handle Stripe errors (works with both old and new stripe library versions)
            if 'stripe' in str(type(e).__module__):
                logger.error(f"Stripe API error retrieving session: {e}")
                raise ExternalServiceError(
                    service="Stripe",
                    message=f"Failed to retrieve session: {str(e)}",
                    details={"session_id": session_id}
                )
            raise
