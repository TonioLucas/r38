"""Unified payment webhook processor HTTP endpoint."""

from firebase_functions import https_fn, options
from flask import jsonify, Request
from google.cloud import firestore
from src.services.webhook_validator import validate_webhook
from src.services.webhook_processors.stripe_processor import process_stripe_webhook
from src.services.webhook_processors.btcpay_processor import process_btcpay_webhook
from src.services.webhook_processors.dub_processor import process_dub_webhook
from src.documents.webhooks.WebhookEvent import WebhookEvent
from src.apis.Db import Db
from src.util.logger import get_logger

logger = get_logger(__name__)


@https_fn.on_request(
    ingress=options.IngressSetting.ALLOW_ALL,  # Webhooks from external providers
    timeout_sec=60,
)
def process_payment_webhook(req: Request):
    """Unified webhook handler for Stripe, BTCPay Server, and dub.co.

    Args:
        req: Firebase HTTP request

    Returns:
        JSON response indicating webhook processing status
    """
    try:
        # Get provider from query parameter
        provider = req.args.get('provider')
        if not provider:
            logger.error("No provider parameter in webhook request")
            return (jsonify({'error': 'Provider parameter required'}), 400)

        # Get raw payload and signature
        payload = req.get_data(as_text=True)

        if not payload:
            logger.error("Empty webhook payload")
            return (jsonify({'error': 'Empty payload'}), 400)

        # Extract signature based on provider
        if provider == 'stripe':
            signature = req.headers.get('Stripe-Signature')
        elif provider in ['btcpay', 'btcpayserver']:
            signature = req.headers.get('BTCPAY-SIG') or req.headers.get('BTCPay-Sig')
        elif provider == 'dub':
            signature = req.headers.get('X-Dub-Signature')
        else:
            logger.error(f"Invalid provider: {provider}")
            return (jsonify({'error': 'Invalid provider'}), 400)

        if not signature:
            logger.error(f"Missing signature for provider {provider}")
            return (jsonify({'error': 'Missing signature'}), 401)

        # Validate webhook signature
        try:
            event = validate_webhook(provider, payload, signature)
        except ValueError as e:
            logger.error(f"Webhook validation failed: {e}")
            return (jsonify({'error': 'Invalid signature'}), 401)

        # Generate event ID for idempotency
        if provider == 'stripe':
            event_id = event['id']
        elif provider == 'dub':
            event_id = event['id']
        else:
            # BTCPay doesn't have event ID, use invoice ID + type
            event_id = f"{event.get('invoiceId', 'unknown')}_{event.get('type', 'unknown')}"

        logger.info(f"Processing webhook {event_id} from {provider}")

        # Process with idempotency using Firestore transaction
        @firestore.transactional
        def process_with_idempotency(transaction):
            db = Db.get_instance()

            # Check if already processed
            event_ref = db.collections["webhook_events"].document(event_id)
            event_doc = event_ref.get(transaction=transaction)

            if event_doc.exists:
                event_data = event_doc.to_dict()
                if event_data.get('processed'):
                    logger.info(f"Event {event_id} already processed (idempotent)")
                    return {'already_processed': True}

            # Create webhook event log
            webhook_event = WebhookEvent(id=event_id)
            webhook_event.create_doc({
                'id': event_id,
                'provider': provider,
                'event_type': event.get('type'),
                'payload': event,
                'signature': signature[:50],  # Store first 50 chars for debugging
                'processed': False,
                'idempotency_key': event_id
            })

            # Process based on provider
            try:
                if provider == 'stripe':
                    process_stripe_webhook(event)
                elif provider == 'dub':
                    process_dub_webhook(event)
                else:
                    process_btcpay_webhook(event)

                # Mark as processed
                webhook_event.mark_processed(success=True)

                logger.info(f"Successfully processed webhook {event_id}")

                return {'success': True}

            except Exception as e:
                logger.error(f"Error processing webhook {event_id}: {e}", exc_info=True)
                webhook_event.mark_processed(success=False, error=str(e))
                raise

        # Execute transaction
        db = Db.get_instance()
        transaction = db.client.transaction()
        result = process_with_idempotency(transaction)

        return (jsonify(result), 200)

    except Exception as e:
        logger.error(f"Webhook processing error: {e}", exc_info=True)
        return (jsonify({'error': 'Internal server error'}), 500)
