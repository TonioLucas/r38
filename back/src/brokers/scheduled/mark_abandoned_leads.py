"""Cloud Scheduler function to mark abandoned checkout leads.

Runs daily at 2 AM Brazil time to identify leads that were initiated
but never converted (no payment after 24 hours).

Optionally syncs abandoned leads to ActiveCampaign for remarketing
if abandoned_checkout_tag_name is configured in Firestore settings.
"""

from firebase_functions import scheduler_fn
from datetime import datetime, timedelta
from typing import Dict, Any
import pytz
from src.util.logger import get_logger
from src.apis.Db import Db
from src.models.firestore_types import LeadStatus
from src.services.activecampaign_service import ActiveCampaignService

logger = get_logger(__name__)


def get_brazilian_timestamp():
    """Get current timestamp in Brazilian timezone (America/Sao_Paulo)"""
    brazil_tz = pytz.timezone('America/Sao_Paulo')
    return datetime.now(brazil_tz)


@scheduler_fn.on_schedule(
    schedule="0 2 * * *",  # Daily at 2 AM
    timezone="America/Sao_Paulo",
    memory=256,  # MB
    timeout_sec=300,  # 5 minutes
)
def mark_abandoned_leads(event: scheduler_fn.ScheduledEvent) -> Dict[str, Any]:
    """Mark checkout leads as abandoned after 24 hours of inactivity.

    Queries leads collection for:
    - source='checkout'
    - status='initiated'
    - createdAt < 24 hours ago

    For each abandoned lead:
    1. Update status to 'abandoned'
    2. If abandoned_checkout_tag configured: sync to ActiveCampaign
    3. If not configured: skip AC sync (no error)

    Returns:
        Summary dict with processed count and errors
    """
    logger.info("Starting abandoned leads detection job")

    db = Db()
    summary = {
        "processed": 0,
        "synced_to_ac": 0,
        "skipped_ac": 0,
        "errors": []
    }

    try:
        # Calculate 24 hours ago timestamp (Brazil timezone)
        cutoff_time = get_brazilian_timestamp() - timedelta(hours=24)
        logger.info(f"Looking for leads created before {cutoff_time}")

        # Query initiated checkout leads older than 24 hours
        leads_ref = db.collections['leads']
        query = (
            leads_ref
            .where('source', '==', 'checkout')
            .where('status', '==', LeadStatus.INITIATED.value)
            .where('createdAt', '<', cutoff_time)
        )

        abandoned_leads = list(query.stream())
        logger.info(f"Found {len(abandoned_leads)} leads to mark as abandoned")

        if not abandoned_leads:
            logger.info("No abandoned leads found")
            return summary

        # Check if ActiveCampaign sync is enabled
        ac_sync_enabled = False
        ac_service = None
        tag_id = None

        try:
            ac_service = ActiveCampaignService()
            abandoned_tag_name = ac_service.abandoned_checkout_tag_name

            if abandoned_tag_name:
                # Get tag ID (will raise error if tag doesn't exist)
                tag_id = ac_service.get_tag_id(abandoned_tag_name)
                if tag_id:
                    ac_sync_enabled = True
                    logger.info(f"ActiveCampaign sync enabled with tag: {abandoned_tag_name} (ID: {tag_id})")
                else:
                    logger.warning(f"Abandoned checkout tag '{abandoned_tag_name}' not found in ActiveCampaign. Skipping AC sync.")
            else:
                logger.info("No abandoned_checkout_tag configured. Skipping ActiveCampaign sync.")
        except Exception as ac_init_error:
            logger.warning(f"Failed to initialize ActiveCampaign service: {ac_init_error}. Skipping AC sync.")

        # Process each abandoned lead
        for lead_doc in abandoned_leads:
            lead_id = lead_doc.id
            lead_data = lead_doc.to_dict()

            try:
                # Update lead status to abandoned
                leads_ref.document(lead_id).update({
                    'status': LeadStatus.ABANDONED.value,
                    'lastUpdatedAt': get_brazilian_timestamp()
                })
                summary["processed"] += 1
                logger.info(f"Marked lead {lead_id} as abandoned")

                # Sync to ActiveCampaign if enabled
                if ac_sync_enabled and ac_service and tag_id:
                    try:
                        email = lead_data.get('email')
                        name = lead_data.get('name', '')
                        phone = lead_data.get('phone', '')

                        if not email:
                            logger.warning(f"Lead {lead_id} has no email, skipping AC sync")
                            summary["skipped_ac"] += 1
                            continue

                        # Parse name into first/last
                        name_parts = name.split(maxsplit=1)
                        first_name = name_parts[0] if name_parts else ""
                        last_name = name_parts[1] if len(name_parts) > 1 else ""

                        # Sync contact (create or update)
                        contact_id = ac_service.sync_contact(
                            email=email,
                            first_name=first_name,
                            last_name=last_name,
                            phone=phone
                        )

                        # Add abandoned checkout tag
                        ac_service.add_tag_to_contact(contact_id, tag_id)

                        # Update lead with AC sync info
                        leads_ref.document(lead_id).update({
                            'activecampaign': {
                                'contactId': contact_id,
                                'tagId': tag_id,
                                'syncedAt': get_brazilian_timestamp(),
                                'syncReason': 'abandoned_checkout'
                            }
                        })

                        summary["synced_to_ac"] += 1
                        logger.info(f"Synced abandoned lead {lead_id} to ActiveCampaign")

                    except Exception as ac_error:
                        logger.error(f"Failed to sync lead {lead_id} to ActiveCampaign: {ac_error}")
                        summary["errors"].append({
                            "lead_id": lead_id,
                            "error": str(ac_error),
                            "type": "activecampaign_sync"
                        })
                        # Don't fail the entire job, continue with next lead
                else:
                    summary["skipped_ac"] += 1

            except Exception as lead_error:
                logger.error(f"Failed to process lead {lead_id}: {lead_error}")
                summary["errors"].append({
                    "lead_id": lead_id,
                    "error": str(lead_error),
                    "type": "lead_update"
                })
                # Continue with next lead

        logger.info(
            f"Abandoned leads job completed. "
            f"Processed: {summary['processed']}, "
            f"Synced to AC: {summary['synced_to_ac']}, "
            f"Skipped AC: {summary['skipped_ac']}, "
            f"Errors: {len(summary['errors'])}"
        )

        return summary

    except Exception as e:
        logger.error(f"Fatal error in abandoned leads job: {e}")
        summary["errors"].append({
            "error": str(e),
            "type": "fatal"
        })
        return summary
