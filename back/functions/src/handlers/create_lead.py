"""
Example handler for creating a lead with reCAPTCHA verification
"""
import logging
from typing import Dict, Any
from firebase_admin import firestore
from firebase_functions import https_fn
from utils.recaptcha import verify_recaptcha

logger = logging.getLogger(__name__)
db = firestore.client()


@https_fn.on_call()
def create_lead(req: https_fn.CallableRequest) -> Dict[str, Any]:
    """
    Create a new lead after verifying reCAPTCHA

    Expected data:
    {
        "name": str,
        "email": str,
        "phone": str (optional),
        "lgpdConsent": bool,
        "recaptchaToken": str,
        "utm": {
            "firstTouch": {
                "source": str (optional),
                "medium": str (optional),
                "campaign": str (optional),
                "term": str (optional),
                "content": str (optional),
                "referrer": str (optional),
                "gclid": str (optional),
                "fbclid": str (optional),
                "timestamp": int
            },
            "lastTouch": {
                "source": str (optional),
                "medium": str (optional),
                "campaign": str (optional),
                "term": str (optional),
                "content": str (optional),
                "referrer": str (optional),
                "gclid": str (optional),
                "fbclid": str (optional),
                "timestamp": int
            }
        },
        "userAgent": str (optional)
    }
    """
    try:
        # Extract data from request
        data = req.data
        recaptcha_token = data.get('recaptchaToken')

        # Verify reCAPTCHA
        recaptcha_result = verify_recaptcha(
            token=recaptcha_token,
            action='lead_submit'  # Should match client-side action
        )

        if not recaptcha_result['success']:
            logger.warning(f"reCAPTCHA verification failed for email {data.get('email')}: "
                          f"{recaptcha_result['error']}")

            # Store the attempt with low score for analysis
            if data.get('email'):
                db.collection('suspicious_attempts').add({
                    'email': data.get('email'),
                    'recaptchaScore': recaptcha_result['score'],
                    'error': recaptcha_result['error'],
                    'ip': req.auth.token.get('ip') if req.auth else None,
                    'timestamp': firestore.SERVER_TIMESTAMP
                })

            return {
                'success': False,
                'error': 'Verification failed. Please try again.'
            }

        # Normalize email
        email = data.get('email', '').lower().strip()

        # Check if lead already exists
        existing_lead = db.collection('leads').where('email', '==', email).limit(1).get()

        if existing_lead:
            logger.info(f"Lead already exists for email: {email}")
            return {
                'success': True,
                'message': 'Lead already registered',
                'leadId': existing_lead[0].id
            }

        # Process UTM data
        utm_data = data.get('utm', {})
        first_touch = utm_data.get('firstTouch', {})
        last_touch = utm_data.get('lastTouch', {})

        # Create lead document
        lead_data = {
            'name': data.get('name', '').strip(),
            'email': email,
            'phone': data.get('phone', '').strip(),
            'ip': req.auth.token.get('ip') if req.auth else None,
            'userAgent': data.get('userAgent', ''),
            'utm': {
                'firstTouch': {
                    'source': first_touch.get('source'),
                    'medium': first_touch.get('medium'),
                    'campaign': first_touch.get('campaign'),
                    'term': first_touch.get('term'),
                    'content': first_touch.get('content'),
                    'referrer': first_touch.get('referrer'),
                    'gclid': first_touch.get('gclid'),
                    'fbclid': first_touch.get('fbclid'),
                    'timestamp': first_touch.get('timestamp')
                },
                'lastTouch': {
                    'source': last_touch.get('source'),
                    'medium': last_touch.get('medium'),
                    'campaign': last_touch.get('campaign'),
                    'term': last_touch.get('term'),
                    'content': last_touch.get('content'),
                    'referrer': last_touch.get('referrer'),
                    'gclid': last_touch.get('gclid'),
                    'fbclid': last_touch.get('fbclid'),
                    'timestamp': last_touch.get('timestamp')
                }
            },
            'consent': {
                'lgpdConsent': data.get('lgpdConsent', False),
                'consentTextVersion': 'v1.0'
            },
            'recaptchaScore': recaptcha_result['score'],
            'download': {
                'count24h': 0
            },
            'createdAt': firestore.SERVER_TIMESTAMP,
            'updatedAt': firestore.SERVER_TIMESTAMP
        }

        # Add to Firestore
        lead_ref = db.collection('leads').add(lead_data)
        lead_id = lead_ref[1].id

        logger.info(f"Lead created successfully: {lead_id} for email: {email}")

        # TODO: Send welcome email with download link
        # TODO: Add to email marketing list if consent given

        return {
            'success': True,
            'message': 'Lead created successfully',
            'leadId': lead_id
        }

    except Exception as e:
        logger.error(f"Error creating lead: {e}")
        return {
            'success': False,
            'error': 'An error occurred. Please try again later.'
        }