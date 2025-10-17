"""Lead conversion service for checkout lead tracking.

Handles converting checkout leads from 'initiated' to 'converted' status
when payment succeeds, and tracks provisioning status throughout the lifecycle.
"""

from typing import Dict, Any, Optional
from datetime import datetime
import pytz
import traceback
from firebase_admin import firestore
from src.apis.Db import Db
from src.util.logger import get_logger
from src.models.firestore_types import LeadStatus, LeadProvisioningStatus

logger = get_logger(__name__)


def get_brazilian_timestamp():
    """Get current timestamp in Brazilian timezone (America/Sao_Paulo)"""
    brazil_tz = pytz.timezone('America/Sao_Paulo')
    return datetime.now(brazil_tz)


class LeadConversionService:
    """Service for managing lead conversion and provisioning status."""

    def __init__(self):
        """Initialize the service."""
        self.db = Db.get_instance()

    def _log_error_to_firestore(
        self,
        source: str,
        error: Exception,
        context: Dict[str, Any]
    ):
        """Log error to error_logs collection for monitoring.

        Args:
            source: Error source identifier (e.g., 'lead_conversion')
            error: Exception instance
            context: Additional context (subscription_id, lead_id, etc.)
        """
        try:
            error_data = {
                'source': source,
                'error_type': type(error).__name__,
                'error_message': str(error),
                'stack_trace': traceback.format_exc(),
                'context': context,
                'resolved': False,
                'createdAt': get_brazilian_timestamp(),
                'lastUpdatedAt': get_brazilian_timestamp()
            }
            self.db.collections['error_logs'].add(error_data)
            logger.info(f"Logged error to Firestore: {source} - {type(error).__name__}")
        except Exception as log_error:
            logger.error(f"Failed to log error to Firestore: {log_error}")

    def mark_lead_as_converted(self, subscription_id: str) -> Dict[str, Any]:
        """Mark a checkout lead as converted when payment succeeds.

        This method is called from webhook processors (Stripe, BTCPay) after
        subscription activation. It:
        1. Finds the lead associated with the subscription
        2. Updates lead status to 'converted'
        3. Checks if provisioning should be paused (manual verification)
        4. Links lead to customer record

        Args:
            subscription_id: ID of the activated subscription

        Returns:
            Dict with:
                - success: bool
                - lead_id: str (if found)
                - requires_manual_verification: bool (if provisioning should pause)
                - reason: str (why operation succeeded/failed)
        """
        try:
            # Get subscription document
            subscription_ref = self.db.collections["subscriptions"].document(subscription_id)
            subscription_doc = subscription_ref.get()

            if not subscription_doc.exists:
                logger.warning(f"Subscription not found: {subscription_id}")
                return {
                    "success": False,
                    "reason": "subscription_not_found"
                }

            subscription_data = subscription_doc.to_dict()

            # Try to get lead_id from subscription metadata
            lead_id = subscription_data.get("metadata", {}).get("lead_id")

            # Fallback: Search by email if lead_id not in metadata
            if not lead_id:
                customer_id = subscription_data.get("customerId")
                if not customer_id:
                    logger.info(f"No customer_id in subscription {subscription_id}, skipping lead conversion")
                    return {
                        "success": True,
                        "reason": "no_customer_id",
                        "requires_manual_verification": False
                    }

                customer_ref = self.db.collections["customers"].document(customer_id)
                customer_doc = customer_ref.get()

                if not customer_doc.exists:
                    logger.warning(f"Customer not found: {customer_id}")
                    return {
                        "success": False,
                        "reason": "customer_not_found"
                    }

                customer_data = customer_doc.to_dict()
                email = customer_data.get("email")

                if not email:
                    logger.warning(f"No email in customer {customer_id}")
                    return {
                        "success": False,
                        "reason": "no_email"
                    }

                # Search for initiated checkout lead with this email
                lead_query = (
                    self.db.collections["leads"]
                    .where("email", "==", email)
                    .where("source", "==", "checkout")
                    .where("status", "==", LeadStatus.INITIATED.value)
                    .limit(1)
                    .get()
                )

                leads = list(lead_query)
                if not leads:
                    logger.info(f"No initiated checkout lead found for email {email}, skipping conversion")
                    return {
                        "success": True,
                        "reason": "no_checkout_lead",
                        "requires_manual_verification": False
                    }

                lead_doc = leads[0]
                lead_id = lead_doc.id
            else:
                # Verify lead exists
                lead_ref = self.db.collections["leads"].document(lead_id)
                lead_doc = lead_ref.get()

                if not lead_doc.exists:
                    logger.warning(f"Lead not found: {lead_id}")
                    return {
                        "success": False,
                        "reason": "lead_not_found"
                    }

            # Get lead data
            lead_data = lead_doc.to_dict() if not hasattr(lead_doc, 'to_dict') else lead_doc.to_dict()

            # Check if this is a checkout lead
            if lead_data.get("source") != "checkout":
                logger.info(f"Lead {lead_id} is not a checkout lead (source={lead_data.get('source')}), skipping conversion")
                return {
                    "success": True,
                    "reason": "not_checkout_lead",
                    "requires_manual_verification": False
                }

            # Check if already converted
            if lead_data.get("status") == LeadStatus.CONVERTED.value:
                logger.info(f"Lead {lead_id} already converted, skipping")
                requires_manual_verification = lead_data.get("requires_manual_verification", False)
                return {
                    "success": True,
                    "lead_id": lead_id,
                    "reason": "already_converted",
                    "requires_manual_verification": requires_manual_verification
                }

            # Get customer_id for linking
            customer_id = subscription_data.get("customerId")

            # Determine if provisioning should be paused
            requires_manual_verification = lead_data.get("requires_manual_verification", False)

            # Update lead status to converted
            lead_ref = self.db.collections["leads"].document(lead_id)
            update_data = {
                "status": LeadStatus.CONVERTED.value,
                "converted_at": get_brazilian_timestamp(),
                "converted_customer_id": customer_id,
                "converted_subscription_id": subscription_id,
                "updatedAt": get_brazilian_timestamp()
            }

            # Set provisioning status based on manual verification requirement
            if requires_manual_verification:
                update_data["provisioning_status"] = LeadProvisioningStatus.PENDING_ADMIN_APPROVAL.value
                logger.info(f"Lead {lead_id} requires manual verification, provisioning will be paused")
            # Note: If no manual verification, provisioning_status remains None
            # and provisioning will run immediately

            lead_ref.update(update_data)
            logger.info(f"Lead {lead_id} marked as converted for subscription {subscription_id}")

            # Update customer's converted_lead_ids array
            if customer_id:
                customer_ref = self.db.collections["customers"].document(customer_id)
                customer_ref.update({
                    "converted_lead_ids": firestore.ArrayUnion([lead_id]),
                    "updatedAt": get_brazilian_timestamp()
                })
                logger.info(f"Added lead {lead_id} to customer {customer_id} converted_lead_ids")

            return {
                "success": True,
                "lead_id": lead_id,
                "reason": "converted",
                "requires_manual_verification": requires_manual_verification
            }

        except Exception as e:
            logger.error(f"Error marking lead as converted for subscription {subscription_id}: {e}", exc_info=True)
            self._log_error_to_firestore(
                source='lead_conversion',
                error=e,
                context={'subscription_id': subscription_id}
            )
            return {
                "success": False,
                "reason": "exception",
                "error": str(e),
                "requires_manual_verification": False
            }

    def mark_lead_provisioning_complete(self, subscription_id: str) -> Dict[str, Any]:
        """Mark lead provisioning as completed.

        Called after successful customer provisioning (Astron Members + ActiveCampaign sync).

        Args:
            subscription_id: ID of the subscription

        Returns:
            Dict with success status
        """
        try:
            # Get subscription to find lead_id
            subscription_ref = self.db.collections["subscriptions"].document(subscription_id)
            subscription_doc = subscription_ref.get()

            if not subscription_doc.exists:
                logger.warning(f"Subscription not found: {subscription_id}")
                return {"success": False, "reason": "subscription_not_found"}

            subscription_data = subscription_doc.to_dict()
            lead_id = subscription_data.get("metadata", {}).get("lead_id")

            if not lead_id:
                logger.info(f"No lead_id in subscription {subscription_id} metadata, skipping")
                return {"success": True, "reason": "no_lead_id"}

            # Update lead provisioning status
            lead_ref = self.db.collections["leads"].document(lead_id)
            lead_ref.update({
                "provisioning_status": LeadProvisioningStatus.COMPLETED.value,
                "provisioning_error": None,  # Clear any previous errors
                "updatedAt": get_brazilian_timestamp()
            })

            logger.info(f"Lead {lead_id} provisioning marked as completed")
            return {"success": True, "lead_id": lead_id}

        except Exception as e:
            logger.error(f"Error marking lead provisioning complete for subscription {subscription_id}: {e}", exc_info=True)
            self._log_error_to_firestore(
                source='lead_provisioning',
                error=e,
                context={'subscription_id': subscription_id, 'action': 'mark_complete'}
            )
            return {"success": False, "reason": "exception", "error": str(e)}

    def mark_lead_provisioning_failed(self, subscription_id: str, error: str) -> Dict[str, Any]:
        """Mark lead provisioning as failed with error message.

        Called when customer provisioning fails (Astron Members or ActiveCampaign error).

        Args:
            subscription_id: ID of the subscription
            error: Error message describing the failure

        Returns:
            Dict with success status
        """
        try:
            # Get subscription to find lead_id
            subscription_ref = self.db.collections["subscriptions"].document(subscription_id)
            subscription_doc = subscription_ref.get()

            if not subscription_doc.exists:
                logger.warning(f"Subscription not found: {subscription_id}")
                return {"success": False, "reason": "subscription_not_found"}

            subscription_data = subscription_doc.to_dict()
            lead_id = subscription_data.get("metadata", {}).get("lead_id")

            if not lead_id:
                logger.info(f"No lead_id in subscription {subscription_id} metadata, skipping")
                return {"success": True, "reason": "no_lead_id"}

            # Update lead provisioning status
            lead_ref = self.db.collections["leads"].document(lead_id)
            lead_ref.update({
                "provisioning_status": LeadProvisioningStatus.FAILED.value,
                "provisioning_error": error,
                "updatedAt": get_brazilian_timestamp()
            })

            logger.info(f"Lead {lead_id} provisioning marked as failed: {error}")
            return {"success": True, "lead_id": lead_id}

        except Exception as e:
            logger.error(f"Error marking lead provisioning failed for subscription {subscription_id}: {e}", exc_info=True)
            self._log_error_to_firestore(
                source='lead_provisioning',
                error=e,
                context={'subscription_id': subscription_id, 'action': 'mark_failed', 'original_error': error}
            )
            return {"success": False, "reason": "exception", "error": str(e)}
