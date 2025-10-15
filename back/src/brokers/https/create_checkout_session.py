"""Create Stripe Checkout Session HTTP endpoint."""

from firebase_functions import https_fn, options
from flask import jsonify, Request
from src.services.stripe_service import StripeService
from src.documents.customers.Subscription import Subscription
from src.documents.products.Product import Product
from src.documents.products.ProductPrice import ProductPrice
from src.util.logger import get_logger
from src.exceptions.CustomError import ExternalServiceError

logger = get_logger(__name__)


@https_fn.on_request(
    cors=options.CorsOptions(
        cors_origins=["https://renato38.com.br", "https://www.renato38.com.br"],
        cors_methods=["POST", "OPTIONS"]
    ),
    timeout_sec=30,
    secrets=["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"]
)
def create_checkout_session(req: Request):
    """Create Stripe Checkout Session for payment.

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
        required = ['subscription_id', 'product_id', 'price_id']
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

        # Get product document
        try:
            product = Product(id=data['product_id'])
            if not product.doc:
                logger.error(f"Product not found: {data['product_id']}")
                return (jsonify({'error': 'Product not found'}), 404)
        except Exception as e:
            logger.error(f"Error fetching product: {e}")
            return (jsonify({'error': 'Product not found'}), 404)

        # Get price document
        try:
            price = ProductPrice(id=data['price_id'])
            if not price.doc:
                logger.error(f"Price not found: {data['price_id']}")
                return (jsonify({'error': 'Price not found'}), 404)
        except Exception as e:
            logger.error(f"Error fetching price: {e}")
            return (jsonify({'error': 'Price not found'}), 404)

        # Create Stripe checkout session
        stripe_service = StripeService()
        checkout_url = stripe_service.create_checkout_session(
            subscription_id=subscription.doc.id,
            product=product,
            price=price,
            affiliate_id=data.get('affiliate_id')
        )

        logger.info(f"Created checkout session for subscription {subscription.doc.id}")

        return (jsonify({
            'success': True,
            'checkout_url': checkout_url
        }), 200)

    except ExternalServiceError as e:
        logger.error(f"External service error: {e}", exc_info=True)
        return (jsonify({'error': 'Payment service error'}), 503)

    except Exception as e:
        logger.error(f"Error creating checkout session: {e}", exc_info=True)
        return (jsonify({'error': 'Internal server error'}), 500)
