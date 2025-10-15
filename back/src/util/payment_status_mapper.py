"""Payment status mapping utilities."""

from src.models.firestore_types import PaymentStatus, PaymentProvider


# Stripe status → unified status
STRIPE_STATUS_MAP = {
    'requires_payment_method': PaymentStatus.PENDING,
    'requires_confirmation': PaymentStatus.PENDING,
    'requires_action': PaymentStatus.PENDING,
    'processing': PaymentStatus.PROCESSING,
    'succeeded': PaymentStatus.CONFIRMED,
    'canceled': PaymentStatus.FAILED,
    'failed': PaymentStatus.FAILED
}

# BTCPay status → unified status
BTCPAY_STATUS_MAP = {
    'New': PaymentStatus.PENDING,
    'Processing': PaymentStatus.PROCESSING,
    'Settled': PaymentStatus.CONFIRMED,
    'Expired': PaymentStatus.FAILED,
    'Invalid': PaymentStatus.FAILED
}


def map_payment_status(provider: PaymentProvider, provider_status: str) -> PaymentStatus:
    """Map provider-specific status to unified status.

    Args:
        provider: Payment provider
        provider_status: Provider-specific status string

    Returns:
        Unified PaymentStatus enum value
    """
    if provider == PaymentProvider.STRIPE:
        return STRIPE_STATUS_MAP.get(provider_status, PaymentStatus.FAILED)
    elif provider == PaymentProvider.BTCPAYSERVER:
        return BTCPAY_STATUS_MAP.get(provider_status, PaymentStatus.FAILED)
    else:
        return PaymentStatus.PENDING


def get_provider_statuses(unified_status: PaymentStatus) -> dict:
    """Get provider statuses matching unified status (for debugging).

    Args:
        unified_status: Unified payment status

    Returns:
        Dictionary mapping providers to their status strings
    """
    stripe_statuses = [k for k, v in STRIPE_STATUS_MAP.items() if v == unified_status]
    btcpay_statuses = [k for k, v in BTCPAY_STATUS_MAP.items() if v == unified_status]
    return {
        'stripe': stripe_statuses,
        'btcpay': btcpay_statuses
    }
