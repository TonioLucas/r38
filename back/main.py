"""
Firebase Functions entry point.
All functions must be exported from this file for deployment.
"""

import logging
from firebase_admin import initialize_app
from firebase_admin import credentials
import os

# Set emulator environment variables if running in emulators
if os.getenv('FUNCTIONS_EMULATOR') == 'true':
    # These are typically already set by the test runner, but ensure they're set
    if not os.getenv('FIRESTORE_EMULATOR_HOST'):
        os.environ['FIRESTORE_EMULATOR_HOST'] = 'localhost:8080'
    if not os.getenv('FIREBASE_AUTH_EMULATOR_HOST'):
        os.environ['FIREBASE_AUTH_EMULATOR_HOST'] = 'localhost:9099'
    if not os.getenv('FIREBASE_STORAGE_EMULATOR_HOST'):
        os.environ['FIREBASE_STORAGE_EMULATOR_HOST'] = 'localhost:9199'

# Initialize Firebase Admin SDK
# The SDK automatically detects emulator environment variables
# No credentials needed when running in emulators
try:
    import firebase_admin
    # Only initialize if no app exists yet
    if not firebase_admin._apps:
        initialize_app()
except ValueError:
    # App already initialized (can happen in tests)
    pass

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Import callable functions
from src.brokers.callable.example_callable import example_callable
from src.brokers.callable.create_item import create_item_callable
from src.brokers.callable.get_item import get_item_callable

# Import HTTPS functions
from src.brokers.https.health_check import health_check
from src.brokers.https.webhook_handler import webhook_handler
from src.brokers.https.create_lead import create_lead
from src.brokers.https.get_download_link import get_download_link

# Import payment functions
from src.brokers.https.create_checkout_session import create_checkout_session
from src.brokers.https.create_btcpay_invoice import create_btcpay_invoice
from src.brokers.https.process_payment_webhook import process_payment_webhook
from src.brokers.https.get_subscription_status import get_subscription_status

# Import provisioning functions
from src.brokers.https.provision_customer import provision_customer

# Import admin functions
from src.brokers.https.admin.approve_verification import approve_manual_verification
from src.brokers.https.admin.reject_verification import reject_manual_verification
from src.brokers.https.admin.regenerate_password import regenerate_customer_password
from src.brokers.https.admin.regenerate_magic_link import regenerate_magic_login_url
from src.brokers.https.admin.extend_entitlement import extend_subscription_entitlement

# Import triggered functions
from src.brokers.triggered.on_item_created import on_item_created
from src.brokers.triggered.on_item_updated import on_item_updated
from src.brokers.triggered.on_item_deleted import on_item_deleted

# Export all functions for Firebase deployment
__all__ = [
    # Callable functions
    'example_callable',
    'create_item_callable',
    'get_item_callable',

    # HTTPS functions
    'health_check',
    'webhook_handler',
    'create_lead',
    'get_download_link',

    # Payment functions
    'create_checkout_session',
    'create_btcpay_invoice',
    'process_payment_webhook',
    'get_subscription_status',

    # Provisioning functions
    'provision_customer',

    # Admin functions
    'approve_manual_verification',
    'reject_manual_verification',
    'regenerate_customer_password',
    'regenerate_magic_login_url',
    'extend_subscription_entitlement',

    # Triggered functions
    'on_item_created',
    'on_item_updated',
    'on_item_deleted',
]

logger.info("Firebase Functions initialized successfully")