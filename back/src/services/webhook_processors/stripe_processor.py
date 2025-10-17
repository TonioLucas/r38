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

            # Convert checkout lead to customer (non-critical operation)
            should_provision = True
            try:
                from src.services.lead_conversion_service import LeadConversionService
                lead_service = LeadConversionService()
                result = lead_service.mark_lead_as_converted(subscription_id)

                # Check if provisioning should be paused (manual verification)
                if result.get('requires_manual_verification'):
                    should_provision = False
                    logger.info(f"Provisioning paused for {subscription_id} - requires manual verification")
                elif result.get('success'):
                    logger.info(f"Lead conversion successful: {result.get('reason', 'converted')}")
            except Exception as e:
                logger.error(f"Lead conversion failed for {subscription_id}: {e}")
                # Non-critical, continue processing

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

            # Read auto-provisioning toggle ONCE and use snapshot (safe default: False)
            from src.apis.Db import Db
            db_instance = Db.get_instance()
            settings_ref = db_instance.collections['settings'].document('main')
            settings_doc = settings_ref.get()

            auto_prov_enabled = False  # Safe default
            if settings_doc.exists:
                settings_data = settings_doc.to_dict()
                auto_prov_enabled = settings_data.get('auto_provisioning_enabled', False)

            logger.info(f"Auto-provisioning toggle: {auto_prov_enabled}, Manual verification flag: {not should_provision} for {subscription_id}")

            # If toggle OFF, create manual_verification instead of provisioning
            if not auto_prov_enabled:
                logger.info(f"Auto-provisioning disabled - creating manual verification for {subscription_id}")

                # CRITICAL: Check if manual_verification already exists (webhook retry idempotency)
                existing = db_instance.collections['manual_verifications'].where(
                    'subscription_created', '==', subscription_id
                ).limit(1).get()

                if len(existing) > 0:
                    logger.warning(f"Manual verification already exists for {subscription_id}, skipping creation")
                else:
                    # Create manual_verification entry
                    verification_data = {
                        'email': getattr(subscription.doc, 'customer_email', ''),
                        'upload_url': '',  # Empty for auto-generated
                        'status': 'pending',
                        'auto_generated': True,  # Flag to distinguish from partner offers
                        'customer_name': getattr(subscription.doc, 'customer_name', ''),
                        'customer_phone': getattr(subscription.doc, 'customer_phone', ''),
                        'submitted_at': db_instance.timestamp_now(),
                        'reviewed_by': None,
                        'reviewed_at': None,
                        'notes': 'Auto-generated - payment confirmed, awaiting manual approval (auto-provisioning toggle OFF)',
                        'subscription_created': subscription_id  # Link to subscription
                    }

                    _, verification_ref = db_instance.collections['manual_verifications'].add(verification_data)
                    verification_id = verification_ref.id

                    logger.info(f"Created auto-generated manual verification {verification_id} for subscription {subscription_id}")

            # Trigger provisioning workflow ONLY if toggle ON and not paused by per-lead flag
            elif should_provision:
                try:
                    from src.services.customer_provisioning_service import CustomerProvisioningService

                    provisioning_service = CustomerProvisioningService()
                    provisioning_result = provisioning_service.provision_customer(subscription_id)

                    logger.info(f"Provisioning triggered successfully for subscription: {subscription_id}")

                    # Mark lead provisioning complete
                    try:
                        from src.services.lead_conversion_service import LeadConversionService
                        lead_service = LeadConversionService()
                        lead_service.mark_lead_provisioning_complete(subscription_id)
                    except Exception as lead_error:
                        logger.error(f"Failed to update lead provisioning status: {lead_error}")

                except Exception as provisioning_error:
                    logger.error(f"Provisioning failed for {subscription_id}: {provisioning_error}", exc_info=True)

                    # Mark lead provisioning failed
                    try:
                        from src.services.lead_conversion_service import LeadConversionService
                        lead_service = LeadConversionService()
                        lead_service.mark_lead_provisioning_failed(subscription_id, str(provisioning_error))
                    except Exception as lead_error:
                        logger.error(f"Failed to update lead provisioning failure: {lead_error}")

                    # Don't fail webhook processing if provisioning fails
                    # Admin can retry manually
            else:
                logger.info(f"Provisioning skipped for {subscription_id} - waiting for manual verification approval")

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
