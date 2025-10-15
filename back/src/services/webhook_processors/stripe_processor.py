"""Stripe webhook event processor."""

import time
from src.documents.customers.Subscription import Subscription
from src.documents.payments.Payment import Payment
from src.models.firestore_types import PaymentStatus, SubscriptionStatus
from src.util.logger import get_logger

logger = get_logger(__name__)


def process_checkout_completed(event: dict):
    """Process checkout.session.completed event.

    Args:
        event: Stripe event dictionary
    """
    session = event['data']['object']

    # Get subscription from metadata
    subscription_id = session['metadata'].get('subscription_id')
    if not subscription_id:
        logger.error(f"No subscription_id in session metadata: {session['id']}")
        return

    logger.info(f"Processing checkout.session.completed for subscription {subscription_id}")

    try:
        subscription = Subscription(id=subscription_id)

        # Update subscription with provider ID
        subscription.update_doc({
            'provider_subscription_id': session['id']
        })

        # Check if payment is completed
        if session.get('payment_status') == 'paid':
            # Activate subscription
            subscription.activate()
            logger.info(f"Activated subscription {subscription_id}")

            # Create payment record
            payment_id = f"payment_{subscription_id}_{int(time.time())}"
            payment = Payment(id=payment_id)
            payment.create_doc({
                'id': payment_id,
                'subscription_id': subscription_id,
                'customer_id': subscription.doc.customer_id,
                'amount': session.get('amount_total', 0),
                'currency': session.get('currency', 'brl').upper(),
                'status': PaymentStatus.CONFIRMED.value,
                'payment_method': subscription.doc.payment_method.value,
                'payment_provider': 'stripe',
                'provider_payment_id': session.get('payment_intent'),
                'provider_metadata': {
                    'session_id': session['id'],
                    'customer_email': session.get('customer_details', {}).get('email') if session.get('customer_details') else None
                },
                'processed_at': subscription.db.timestamp_now()
            })

            logger.info(f"Created payment record {payment_id} for subscription {subscription_id}")

    except Exception as e:
        logger.error(f"Error processing checkout.session.completed: {e}", exc_info=True)
        raise


def process_payment_intent_failed(event: dict):
    """Process payment_intent.failed event.

    Args:
        event: Stripe event dictionary
    """
    intent = event['data']['object']

    # Log failure but don't change subscription status
    # (stays as payment_pending, customer can retry)
    error_message = intent.get('last_payment_error', {}).get('message', 'Unknown error')

    logger.error(f"Payment failed: {intent['id']}, reason: {error_message}")


def process_stripe_webhook(event: dict):
    """Route Stripe event to appropriate handler.

    Args:
        event: Stripe event dictionary
    """
    event_type = event['type']

    logger.info(f"Processing Stripe webhook event: {event_type}")

    # Event handlers
    handlers = {
        'checkout.session.completed': process_checkout_completed,
        'payment_intent.failed': process_payment_intent_failed,
        # Add more handlers as needed
    }

    handler = handlers.get(event_type)

    if handler:
        try:
            handler(event)
        except Exception as e:
            logger.error(f"Error in Stripe event handler for {event_type}: {e}", exc_info=True)
            raise
    else:
        logger.info(f"Unhandled Stripe event type: {event_type}")
