"""Create BTCPay Server invoice HTTP endpoint."""

import os
import asyncio
from datetime import datetime, timedelta
from firebase_functions import https_fn, options
from flask import jsonify, Request
from src.services.btcpay_service import BTCPayService
from src.documents.customers.Subscription import Subscription
from src.util.logger import get_logger
from src.exceptions.CustomError import ExternalServiceError

logger = get_logger(__name__)


def transform_to_entitlements(base, price):
    """Transform BaseEntitlementsData to EntitlementsData structure.

    Args:
        base: BaseEntitlementsData from product
        price: ProductPriceDoc with includes_mentorship flag

    Returns:
        dict: EntitlementsData structure for subscription
    """
    # Platform is always required
    entitlements = {
        "platform": {
            "expires_at": None if base.platform_months is None
                         else datetime.now() + timedelta(days=base.platform_months * 30),
            "courses": [],
            "enabled": True
        }
    }

    # Support is optional
    if base.support_months is not None:
        entitlements["support"] = {
            "expires_at": datetime.now() + timedelta(days=base.support_months * 30),
            "courses": [],
            "enabled": True
        }

    # Mentorship is optional (from base or price)
    if price.includes_mentorship or base.mentorship_included:
        entitlements["mentorship"] = {
            "expires_at": None,  # Lifetime for mentorship
            "courses": [],
            "enabled": True
        }

    return entitlements

# Environment-based CORS configuration
ENV = os.getenv('ENV', 'production')
CORS_ORIGINS = ["https://renato38.com.br", "https://www.renato38.com.br"]
if ENV == 'development':
    CORS_ORIGINS.append("http://localhost:3000")

@https_fn.on_request(
    cors=options.CorsOptions(
        cors_origins=CORS_ORIGINS,
        cors_methods=["POST", "OPTIONS"]
    ),
    timeout_sec=30,
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

        # Validate required fields - support both old and new API formats
        # New format: priceId, email, name (from frontend)
        # Old format: subscription_id, amount (legacy)
        if 'priceId' in data:
            # New format from frontend
            required = ['priceId', 'email', 'name']
            for field in required:
                if field not in data:
                    logger.warning(f"Missing required field: {field}")
                    return (jsonify({'error': f'{field} required'}), 400)

            from src.documents.products.Product import Product
            from src.documents.products.ProductPrice import ProductPrice
            from src.models.firestore_types import SubscriptionStatus, PaymentMethod, PaymentProvider
            from src.apis.Db import Db

            price_id = data['priceId']
            email = data['email']
            name = data['name']
            phone = data.get('phone')
            affiliate_code = data.get('affiliateCode')

            # Get price document to determine amount
            try:
                from src.documents.products.ProductPrice import ProductPrice
                price = ProductPrice(id=price_id)
                if not price.doc:
                    logger.error(f"Price not found: {price_id}")
                    return (jsonify({'error': 'Price not found'}), 404)
                amount = price.doc.amount
                currency = price.doc.currency
            except Exception as e:
                logger.error(f"Error fetching price: {e}")
                return (jsonify({'error': 'Price not found'}), 404)

            # Get product document
            try:
                product = Product(id=price.doc.product_id)
                if not product.doc:
                    logger.error(f"Product not found: {price.doc.product_id}")
                    return (jsonify({'error': 'Product not found'}), 404)
            except Exception as e:
                logger.error(f"Error fetching product: {e}")
                return (jsonify({'error': 'Product not found'}), 404)

            # Create customer and subscription
            db = Db.get_instance()

            # Find or create customer
            customers_ref = db.collections["customers"]
            customer_query = customers_ref.where("email", "==", email).limit(1).get()

            if len(customer_query) > 0:
                customer_id = customer_query[0].id
            else:
                # Create new customer
                customer_data = {
                    "email": email,
                    "name": name,
                    "phone": phone,
                    "created_at": db.timestamp_now(),
                    "updated_at": db.timestamp_now()
                }
                _, customer_ref = customers_ref.add(customer_data)
                customer_id = customer_ref.id

            # Create subscription with PAYMENT_PENDING status
            subscription_data = {
                "customer_id": customer_id,
                "product_id": product.doc.id,
                "price_id": price.doc.id,
                "status": SubscriptionStatus.PAYMENT_PENDING.value,
                "entitlements": transform_to_entitlements(product.doc.base_entitlements, price.doc),
                "payment_method": PaymentMethod.BTC.value,
                "payment_provider": PaymentProvider.BTCPAYSERVER.value,
                "amount_paid": amount,
                "currency": currency,
                "created_at": db.timestamp_now(),
                "updated_at": db.timestamp_now()
            }

            # Add affiliate data if provided
            if affiliate_code:
                subscription_data["affiliate_data"] = {
                    "affiliate_code": affiliate_code,
                    "recorded_at": db.timestamp_now()
                }

            _, subscription_ref = db.collections["subscriptions"].add(subscription_data)
            subscription_id = subscription_ref.id

            logger.info(f"Created subscription {subscription_id} for customer {customer_id}")
        else:
            # Old format (legacy support)
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
                subscription_id = subscription.doc.id
            except Exception as e:
                logger.error(f"Error fetching subscription: {e}")
                return (jsonify({'error': 'Subscription not found'}), 404)

            amount = data['amount']
            currency = data.get('currency', 'BRL')
            affiliate_code = data.get('affiliate_id')

        # Create BTCPay invoice (async)
        btcpay_service = BTCPayService()

        # Run async function in sync context
        checkout_url = asyncio.run(btcpay_service.create_invoice(
            subscription_id=subscription_id,
            amount=amount,
            currency=currency,
            affiliate_id=affiliate_code
        ))

        logger.info(f"Created BTCPay invoice for subscription {subscription_id}")

        return (jsonify({
            'success': True,
            'checkoutUrl': checkout_url
        }), 200)

    except ExternalServiceError as e:
        logger.error(f"External service error: {e}", exc_info=True)
        return (jsonify({'error': 'Payment service error'}), 503)

    except Exception as e:
        logger.error(f"Error creating BTCPay invoice: {e}", exc_info=True)
        return (jsonify({'error': 'Internal server error'}), 500)
