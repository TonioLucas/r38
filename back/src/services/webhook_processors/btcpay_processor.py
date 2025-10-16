"""BTCPay Server webhook event processor."""

import time
from src.documents.customers.Subscription import Subscription
from src.documents.payments.Payment import Payment
from src.models.firestore_types import PaymentStatus, SubscriptionStatus
from src.util.logger import get_logger

logger = get_logger(__name__)


def process_invoice_settled(event: dict):
    """Process InvoiceSettled event (payment confirmed).

    Args:
        event: BTCPay webhook event dictionary
    """
    invoice = event

    # Get subscription from metadata
    subscription_id = invoice.get('metadata', {}).get('subscriptionId') or invoice.get('orderId')
    if not subscription_id:
        logger.error(f"No subscription_id in invoice metadata: {invoice.get('id')}")
        return

    logger.info(f"Processing InvoiceSettled for subscription {subscription_id}")

    try:
        subscription = Subscription(id=subscription_id)

        # Activate subscription
        subscription.activate()
        logger.info(f"Activated subscription {subscription_id}")

        # Extract Bitcoin payment details
        crypto_info = invoice.get('cryptoInfo', [{}])[0] if invoice.get('cryptoInfo') else {}

        # Create payment record
        payment_id = f"payment_{subscription_id}_{int(time.time())}"
        payment = Payment(id=payment_id)

        payment_data = {
            'id': payment_id,
            'subscription_id': subscription_id,
            'customer_id': subscription.doc.customer_id,
            'amount': int(float(invoice.get('amount', 0)) * 100),  # Convert to centavos
            'currency': invoice.get('currency', 'BRL'),
            'status': PaymentStatus.CONFIRMED.value,
            'payment_method': subscription.doc.payment_method.value,
            'payment_provider': 'btcpayserver',
            'provider_payment_id': invoice.get('id'),
            'provider_metadata': {
                'invoice_id': invoice.get('id'),
                'payment_method': invoice.get('paymentMethod'),
            },
            'processed_at': subscription.db.timestamp_now()
        }

        # Add Bitcoin-specific data if available
        if subscription.doc.payment_method.value == 'btc':
            payment_data['btc_data'] = {
                'address': crypto_info.get('address'),
                'confirmations': crypto_info.get('confirmations', 0),
                'txid': crypto_info.get('txId'),
                'confirmed_at': subscription.db.timestamp_now()
            }

        payment.create_doc(payment_data)

        logger.info(f"Created payment record {payment_id} for subscription {subscription_id}")

        # Trigger provisioning workflow
        try:
            from src.services.customer_provisioning_service import CustomerProvisioningService

            provisioning_service = CustomerProvisioningService()
            provisioning_result = provisioning_service.provision_customer(subscription_id)

            logger.info(f"Provisioning triggered successfully for subscription: {subscription_id}")

        except Exception as provisioning_error:
            logger.error(f"Provisioning failed for {subscription_id}: {provisioning_error}", exc_info=True)
            # Don't fail webhook processing if provisioning fails
            # Admin can retry manually

    except Exception as e:
        logger.error(f"Error processing InvoiceSettled: {e}", exc_info=True)
        raise


def process_invoice_expired(event: dict):
    """Process InvoiceExpired event.

    Args:
        event: BTCPay webhook event dictionary
    """
    invoice = event

    logger.warning(f"Invoice expired: {invoice.get('id')}, orderId: {invoice.get('orderId')}")
    # Don't change subscription status, customer can create a new invoice


def process_invoice_invalid(event: dict):
    """Process InvoiceInvalid event.

    Args:
        event: BTCPay webhook event dictionary
    """
    invoice = event

    logger.error(f"Invoice invalid: {invoice.get('id')}, orderId: {invoice.get('orderId')}")
    # Don't change subscription status, requires admin review


def process_btcpay_webhook(event: dict):
    """Route BTCPay event to appropriate handler.

    Args:
        event: BTCPay event dictionary
    """
    event_type = event.get('type')

    logger.info(f"Processing BTCPay webhook event: {event_type}")

    # Event handlers
    handlers = {
        'InvoiceSettled': process_invoice_settled,
        'InvoiceExpired': process_invoice_expired,
        'InvoiceInvalid': process_invoice_invalid,
    }

    handler = handlers.get(event_type)

    if handler:
        try:
            handler(event)
        except Exception as e:
            logger.error(f"Error in BTCPay event handler for {event_type}: {e}", exc_info=True)
            raise
    else:
        logger.info(f"Unhandled BTCPay event type: {event_type}")
