"""Unified webhook validation for payment providers."""

import json
from src.services.stripe_service import StripeService
from src.services.btcpay_service import BTCPayService
from src.services.dub_service import DubService
from src.util.logger import get_logger

logger = get_logger(__name__)


def validate_stripe_webhook(payload: str, signature: str) -> dict:
    """Validate Stripe webhook signature and return event.

    Args:
        payload: Raw webhook payload (string)
        signature: Stripe-Signature header value

    Returns:
        Stripe event dictionary

    Raises:
        ValueError: If signature verification fails
    """
    service = StripeService()
    return service.verify_webhook_signature(payload, signature)


def validate_btcpay_webhook(payload: str, signature: str) -> dict:
    """Validate BTCPay Server webhook signature and return event.

    Args:
        payload: Raw webhook payload (string)
        signature: BTCPAY-SIG header value

    Returns:
        BTCPay event dictionary

    Raises:
        ValueError: If signature verification fails
    """
    service = BTCPayService()

    if not service.verify_webhook_signature(payload, signature):
        raise ValueError('Invalid BTCPay signature')

    # Parse JSON payload
    try:
        return json.loads(payload)
    except json.JSONDecodeError as e:
        raise ValueError(f'Invalid JSON payload: {str(e)}')


def validate_dub_webhook(payload: str, signature: str) -> dict:
    """Validate dub.co webhook signature and return event.

    Args:
        payload: Raw webhook payload (string)
        signature: X-Dub-Signature header value

    Returns:
        dub.co event dictionary

    Raises:
        ValueError: If signature verification fails
    """
    service = DubService()

    if not service.verify_webhook_signature(payload, signature):
        raise ValueError('Invalid dub.co signature')

    # Parse JSON payload
    try:
        return json.loads(payload)
    except json.JSONDecodeError as e:
        raise ValueError(f'Invalid JSON payload: {str(e)}')


def validate_webhook(provider: str, payload: str, signature: str) -> dict:
    """Validate webhook based on provider.

    Args:
        provider: Payment provider ('stripe', 'btcpay', 'btcpayserver', or 'dub')
        payload: Raw webhook payload (string)
        signature: Signature header value

    Returns:
        Event dictionary

    Raises:
        ValueError: If provider is unknown or signature verification fails
    """
    logger.info(f"Validating webhook for provider: {provider}")

    if provider == 'stripe':
        return validate_stripe_webhook(payload, signature)
    elif provider in ['btcpay', 'btcpayserver']:
        return validate_btcpay_webhook(payload, signature)
    elif provider == 'dub':
        return validate_dub_webhook(payload, signature)
    else:
        raise ValueError(f'Unknown provider: {provider}')
