"""Get subscription status HTTP endpoint."""

from firebase_functions import https_fn, options
from flask import jsonify, Request
from src.documents.customers.Subscription import Subscription
from src.util.logger import get_logger

logger = get_logger(__name__)


@https_fn.on_request(
    cors=options.CorsOptions(
        cors_origins=["https://renato38.com.br", "https://www.renato38.com.br"],
        cors_methods=["GET", "OPTIONS"]
    ),
    timeout_sec=10
)
def get_subscription_status(req: Request):
    """Get subscription status by ID.

    Args:
        req: Firebase HTTP request

    Returns:
        JSON response with subscription data
    """
    try:
        # Only allow GET method
        if req.method != 'GET':
            logger.warning(f"Invalid method attempted: {req.method}")
            return (jsonify({'error': 'Method not allowed'}), 405)

        # Get subscription_id from query parameter
        subscription_id = req.args.get('subscription_id')
        if not subscription_id:
            logger.warning("No subscription_id provided")
            return (jsonify({'error': 'subscription_id required'}), 400)

        # Get subscription document
        try:
            subscription = Subscription(id=subscription_id)
            if not subscription.doc:
                logger.error(f"Subscription not found: {subscription_id}")
                return (jsonify({'error': 'Subscription not found'}), 404)
        except Exception as e:
            logger.error(f"Error fetching subscription: {e}")
            return (jsonify({'error': 'Subscription not found'}), 404)

        # Return subscription data
        return (jsonify({
            'success': True,
            'subscription': {
                'id': subscription.doc.id,
                'status': subscription.doc.status.value,
                'customer_id': subscription.doc.customer_id,
                'product_id': subscription.doc.product_id,
                'access_granted_at': subscription.doc.access_granted_at.isoformat() if subscription.doc.access_granted_at else None,
                'payment_method': subscription.doc.payment_method.value,
                'payment_provider': subscription.doc.payment_provider.value,
            }
        }), 200)

    except Exception as e:
        logger.error(f"Error getting subscription: {e}", exc_info=True)
        return (jsonify({'error': 'Internal server error'}), 500)
