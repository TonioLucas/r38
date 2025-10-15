"""Create BTCPay Server invoice HTTP endpoint."""

import asyncio
from firebase_functions import https_fn, options
from flask import jsonify, Request
from src.services.btcpay_service import BTCPayService
from src.documents.customers.Subscription import Subscription
from src.util.logger import get_logger
from src.exceptions.CustomError import ExternalServiceError

logger = get_logger(__name__)


@https_fn.on_request(
    cors=options.CorsOptions(
        cors_origins=["https://renato38.com.br", "https://www.renato38.com.br"],
        cors_methods=["POST", "OPTIONS"]
    ),
    timeout_sec=30,
    secrets=["BTCPAY_API_KEY", "BTCPAY_WEBHOOK_SECRET"]
)
def create_btcpay_invoice(req: Request):
    """Create BTCPay Server invoice for Bitcoin payment.

    Args:
        req: Firebase HTTP request

    Returns:
        JSON response with checkout URL
    """
    try:
        # Only allow POST method
        if req.method != 'POST':
            logger.warning(f"Invalid method attempted: {req.method}")
            return (jsonify({'error': 'Method not allowed'}), 405)

        # Parse JSON body
        data = req.get_json()
        if not data:
            logger.error("No JSON data provided")
            return (jsonify({'error': 'Invalid JSON'}), 400)

        # Validate required fields
        required = ['subscription_id', 'amount']
        for field in required:
            if field not in data:
                logger.warning(f"Missing required field: {field}")
                return (jsonify({'error': f'{field} required'}), 400)

        # Get subscription document
        try:
            subscription = Subscription(id=data['subscription_id'])
            if not subscription.doc:
                logger.error(f"Subscription not found: {data['subscription_id']}")
                return (jsonify({'error': 'Subscription not found'}), 404)
        except Exception as e:
            logger.error(f"Error fetching subscription: {e}")
            return (jsonify({'error': 'Subscription not found'}), 404)

        # Create BTCPay invoice (async)
        btcpay_service = BTCPayService()

        # Run async function in sync context
        checkout_url = asyncio.run(btcpay_service.create_invoice(
            subscription_id=subscription.doc.id,
            amount=data['amount'],
            currency=data.get('currency', 'BRL'),
            affiliate_id=data.get('affiliate_id')
        ))

        logger.info(f"Created BTCPay invoice for subscription {subscription.doc.id}")

        return (jsonify({
            'success': True,
            'checkout_url': checkout_url
        }), 200)

    except ExternalServiceError as e:
        logger.error(f"External service error: {e}", exc_info=True)
        return (jsonify({'error': 'Payment service error'}), 503)

    except Exception as e:
        logger.error(f"Error creating BTCPay invoice: {e}", exc_info=True)
        return (jsonify({'error': 'Internal server error'}), 500)
