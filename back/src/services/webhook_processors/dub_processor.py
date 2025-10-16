"""Process dub.co webhook events."""

import json
from typing import Dict, Any
from google.cloud import firestore
from src.util.logger import get_logger
from src.documents.webhooks.WebhookEvent import WebhookEvent

logger = get_logger(__name__)


def process_dub_webhook(event: Dict[str, Any]) -> Dict[str, Any]:
    """Process dub.co webhook event based on type.

    Args:
        event: Parsed webhook event

    Returns:
        Processing result
    """
    event_type = event.get('event')
    event_id = event.get('id')
    event_data = event.get('data', {})

    logger.info(f"Processing dub.co event: {event_type}, ID: {event_id}")

    # Route to specific handler
    if event_type == 'sale.created':
        return _process_sale_created(event_data)
    elif event_type == 'lead.created':
        return _process_lead_created(event_data)
    elif event_type == 'commission.created':
        return _process_commission_created(event_data)
    elif event_type == 'partner.enrolled':
        return _process_partner_enrolled(event_data)
    elif event_type == 'link.created':
        return _process_link_created(event_data)
    elif event_type == 'link.clicked':
        return _process_link_clicked(event_data)
    else:
        logger.warning(f"Unhandled dub.co event type: {event_type}")
        return {'processed': False, 'reason': f'Unhandled event type: {event_type}'}


def _process_sale_created(data: Dict[str, Any]) -> Dict[str, Any]:
    """Process sale.created event.

    Args:
        data: Event data containing sale information

    Returns:
        Processing result
    """
    customer = data.get('customer', {})
    customer_id = customer.get('id')
    customer_email = customer.get('email')

    sale_amount = data.get('saleAmount')
    currency = data.get('currency', 'USD')

    # Partner information if available
    partner = data.get('partner', {})
    partner_id = partner.get('id')
    partner_name = partner.get('name')

    logger.info(
        f"Sale created: Customer {customer_email} ({customer_id}), "
        f"Amount: {sale_amount} {currency}"
    )

    if partner_id:
        logger.info(f"Sale attributed to partner: {partner_name} ({partner_id})")

    # Additional processing could be added here
    # For example, updating internal analytics or sending notifications

    return {'processed': True, 'sale_amount': sale_amount}


def _process_lead_created(data: Dict[str, Any]) -> Dict[str, Any]:
    """Process lead.created event.

    Args:
        data: Event data containing lead information

    Returns:
        Processing result
    """
    customer = data.get('customer', {})
    customer_id = customer.get('id')
    customer_email = customer.get('email')
    event_name = data.get('eventName', 'Sign Up')

    # Click information
    click = data.get('click', {})
    click_id = click.get('id')

    # Link information
    link = data.get('link', {})
    link_url = link.get('shortLink')

    logger.info(
        f"Lead created: {event_name} for customer {customer_email} ({customer_id}), "
        f"Click ID: {click_id}, Link: {link_url}"
    )

    # Could trigger welcome email or other onboarding actions here

    return {'processed': True, 'customer_id': customer_id}


def _process_commission_created(data: Dict[str, Any]) -> Dict[str, Any]:
    """Process commission.created event.

    Args:
        data: Event data containing commission information

    Returns:
        Processing result
    """
    commission_id = data.get('id')
    amount = data.get('amount')
    currency = data.get('currency', 'USD')
    status = data.get('status')  # 'pending', 'processed', or 'paid'

    # Partner information
    partner = data.get('partner', {})
    partner_id = partner.get('id')
    partner_email = partner.get('email')

    # Sale information
    sale = data.get('sale', {})
    sale_amount = sale.get('amount')

    logger.info(
        f"Commission created: {amount} {currency} for partner {partner_email} "
        f"({partner_id}), Status: {status}, Sale amount: {sale_amount}"
    )

    # Could notify partner about commission or update internal records

    return {
        'processed': True,
        'commission_id': commission_id,
        'partner_id': partner_id,
        'amount': amount
    }


def _process_partner_enrolled(data: Dict[str, Any]) -> Dict[str, Any]:
    """Process partner.enrolled event.

    Args:
        data: Event data containing partner enrollment information

    Returns:
        Processing result
    """
    partner_id = data.get('id')
    partner_name = data.get('name')
    partner_email = data.get('email')
    status = data.get('status')
    program_id = data.get('programId')

    # Partner statistics
    clicks = data.get('clicks', 0)
    leads = data.get('leads', 0)
    sales = data.get('sales', 0)
    sale_amount = data.get('saleAmount', 0)
    earnings = data.get('earnings', 0)

    # Partner links
    links = data.get('links', [])

    logger.info(
        f"Partner enrolled: {partner_name} ({partner_email}), "
        f"ID: {partner_id}, Status: {status}, Program: {program_id}"
    )

    if links:
        for link in links:
            logger.info(f"Partner link: {link.get('shortLink')}")

    # Could send welcome email to partner or create internal partner record

    return {
        'processed': True,
        'partner_id': partner_id,
        'partner_email': partner_email,
        'links_count': len(links)
    }


def _process_link_created(data: Dict[str, Any]) -> Dict[str, Any]:
    """Process link.created event.

    Args:
        data: Event data containing link information

    Returns:
        Processing result
    """
    link_id = data.get('id')
    short_link = data.get('shortLink')
    url = data.get('url')
    key = data.get('key')

    logger.info(f"Link created: {short_link} -> {url}, Key: {key}, ID: {link_id}")

    return {'processed': True, 'link_id': link_id}


def _process_link_clicked(data: Dict[str, Any]) -> Dict[str, Any]:
    """Process link.clicked event (high-volume).

    Args:
        data: Event data containing click information

    Returns:
        Processing result
    """
    click_id = data.get('clickId')
    timestamp = data.get('timestamp')

    # Geographic information
    country = data.get('country')
    city = data.get('city')

    # Device information
    device = data.get('device')
    browser = data.get('browser')
    os = data.get('os')

    # Link information
    link = data.get('link', {})
    link_key = link.get('key')

    logger.debug(
        f"Link clicked: {link_key}, Click ID: {click_id}, "
        f"Location: {city}, {country}, Device: {device}/{browser}/{os}"
    )

    # Usually don't need to process individual clicks
    # This is a high-volume event

    return {'processed': True, 'click_id': click_id}