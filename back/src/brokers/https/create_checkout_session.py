"""Create Stripe Checkout Session HTTP endpoint."""

import os
from datetime import datetime, timedelta
from firebase_functions import https_fn, options
from flask import jsonify, Request
from src.services.stripe_service import StripeService
from src.documents.customers.Subscription import Subscription
from src.documents.products.Product import Product
from src.documents.products.ProductPrice import ProductPrice
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

        # Validate required fields - support both old and new API formats
        # New format: priceId, email, name (from frontend)
        # Old format: subscription_id, product_id, price_id (legacy)
        if 'priceId' in data:
            # New format from frontend
            required = ['priceId', 'email', 'name']
            for field in required:
                if field not in data:
                    logger.warning(f"Missing required field: {field}")
                    return (jsonify({'error': f'{field} required'}), 400)

            price_id = data['priceId']
            email = data['email']
            name = data['name']
            phone = data.get('phone')
            affiliate_code = data.get('affiliateCode')
        else:
            # Old format (legacy support)
            required = ['subscription_id', 'product_id', 'price_id']
            for field in required:
                if field not in data:
                    logger.warning(f"Missing required field: {field}")
                    return (jsonify({'error': f'{field} required'}), 400)

            price_id = data['price_id']
            # For legacy format, get subscription to extract user info
            try:
                subscription = Subscription(id=data['subscription_id'])
                if not subscription.doc:
                    logger.error(f"Subscription not found: {data['subscription_id']}")
                    return (jsonify({'error': 'Subscription not found'}), 404)
            except Exception as e:
                logger.error(f"Error fetching subscription: {e}")
                return (jsonify({'error': 'Subscription not found'}), 404)

        # Get price document
        try:
            price = ProductPrice(id=price_id)
            if not price.doc:
                logger.error(f"Price not found: {price_id}")
                return (jsonify({'error': 'Price not found'}), 404)
        except Exception as e:
            logger.error(f"Error fetching price: {e}")
            return (jsonify({'error': 'Price not found'}), 404)

        # Get product document from price
        try:
            product = Product(id=price.doc.product_id)
            if not product.doc:
                logger.error(f"Product not found: {price.doc.product_id}")
                return (jsonify({'error': 'Product not found'}), 404)
        except Exception as e:
            logger.error(f"Error fetching product: {e}")
            return (jsonify({'error': 'Product not found'}), 404)

        # Check for manual purchase override
        manual_override_token = data.get('manualOverrideToken')
        manual_purchase_metadata = None

        if manual_override_token:
            from src.apis.Db import Db
            db_instance = Db.get_instance()
            settings_ref = db_instance.collections['settings'].document('main')
            settings_doc = settings_ref.get()

            if settings_doc.exists:
                settings = settings_doc.to_dict()
                manual_settings = settings.get('manual_purchase')

                # Validate override conditions
                admin_emails = [
                    'admin@renato38.com.br',
                    'antoniolucasdeor@gmail.com',
                    'bitcoinblackpill@gmail.com',
                    'renato@trezoitao.com.br'
                ]

                if (manual_settings and
                    manual_settings.get('enabled') and
                    manual_settings.get('override_token') == manual_override_token and
                    email.lower() in [e.lower() for e in admin_emails]):

                    # OVERRIDE PRICE
                    original_amount = price.doc.amount
                    override_amount = manual_settings.get('override_price_centavos', 500)

                    # Store metadata for audit
                    manual_purchase_metadata = {
                        'is_manual_purchase': True,
                        'override_token_used': manual_override_token,
                        'admin_email': email,
                        'original_price_id': price.doc.id,
                        'original_amount': original_amount,
                        'override_amount': override_amount,
                        'created_at': db_instance.timestamp_now()
                    }

                    # Override price for Stripe
                    price.doc.amount = override_amount

                    # Log admin action
                    db_instance.collections['admin_actions'].add({
                        'action': 'manual_purchase_override',
                        'admin_email': email,
                        'product_id': product.doc.id,
                        'price_id': price.doc.id,
                        'original_amount': original_amount,
                        'override_amount': override_amount,
                        'timestamp': db_instance.timestamp_now()
                    })

                    logger.info(f"Manual purchase override applied: {email} | {original_amount} → {override_amount}")

        # Create subscription if using new format
        if 'priceId' in data:
            from src.models.firestore_types import SubscriptionStatus, PaymentMethod, PaymentProvider, EntitlementsData, AffiliateData
            from src.apis.Db import Db

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
                "payment_method": PaymentMethod.CREDIT_CARD.value,  # Will be updated by webhook
                "payment_provider": PaymentProvider.STRIPE.value,
                "amount_paid": price.doc.amount,
                "currency": price.doc.currency,
                "created_at": db.timestamp_now(),
                "updated_at": db.timestamp_now()
            }

            # Add affiliate data if provided
            if affiliate_code:
                subscription_data["affiliate_data"] = {
                    "affiliate_code": affiliate_code,
                    "recorded_at": db.timestamp_now()
                }

            # Add manual purchase metadata if override was applied
            if manual_purchase_metadata:
                subscription_data["manual_purchase_metadata"] = manual_purchase_metadata

            _, subscription_ref = db.collections["subscriptions"].add(subscription_data)
            subscription_id = subscription_ref.id
            subscription = Subscription(id=subscription_id)

            logger.info(f"Created subscription {subscription_id} for customer {customer_id}")

            # Handle partner offer verification
            partner_offer = data.get('partnerOffer')
            if partner_offer:
                verification_data = {
                    'email': email,
                    'upload_url': partner_offer.get('proofUrl'),
                    'status': 'pending',
                    'partner_source': partner_offer.get('partner'),
                    'customer_name': name,
                    'customer_phone': phone,
                    'submitted_at': db.timestamp_now(),
                    'reviewed_by': None,
                    'reviewed_at': None,
                    'notes': None,
                    'subscription_created': subscription_id,
                    'created_at': db.timestamp_now(),
                    'updated_at': db.timestamp_now()
                }

                _, verification_ref = db.collections['manual_verifications'].add(verification_data)
                verification_id = verification_ref.id

                logger.info(f"Created manual verification {verification_id} for partner offer: {partner_offer.get('partner')}")

                # Update subscription with verification reference
                subscription_ref.update({
                    'manual_verification': {
                        'verification_id': verification_id,
                        'partner_source': partner_offer.get('partner'),
                        'proof_url': partner_offer.get('proofUrl'),
                        'submitted_at': db.timestamp_now()
                    }
                })
        else:
            subscription_id = subscription.doc.id

        # Create Stripe checkout session
        stripe_service = StripeService()
        # Extract lead_id if provided (for checkout abandonment tracking)
        lead_id = data.get('leadId') if 'priceId' in data else data.get('lead_id')
        checkout_url = stripe_service.create_checkout_session(
            subscription_id=subscription_id,
            product=product,
            price=price,
            affiliate_id=affiliate_code if 'priceId' in data else data.get('affiliate_id'),
            lead_id=lead_id
        )

        logger.info(f"Created checkout session for subscription {subscription_id}")

        return (jsonify({
            'success': True,
            'checkoutUrl': checkout_url
        }), 200)

    except ExternalServiceError as e:
        logger.error(f"External service error: {e}", exc_info=True)
        return (jsonify({'error': 'Payment service error'}), 503)

    except Exception as e:
        logger.error(f"Error creating checkout session: {e}", exc_info=True)
        return (jsonify({'error': 'Internal server error'}), 500)
