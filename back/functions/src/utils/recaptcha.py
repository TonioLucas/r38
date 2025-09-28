"""
reCAPTCHA v3 verification utility
"""
import os
import logging
import requests
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)

# Get reCAPTCHA secret key from environment
# Try to get from environment variable first (for local dev), then from Firebase config
RECAPTCHA_SECRET_KEY = os.environ.get('RECAPTCHA_SECRET_KEY')
if not RECAPTCHA_SECRET_KEY:
    try:
        # Try Firebase Functions config (for production)
        import functions_framework
        RECAPTCHA_SECRET_KEY = os.environ.get('recaptcha_secret_key')
    except:
        pass
RECAPTCHA_VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify'

# Minimum score threshold (0.0 to 1.0)
# 0.5 is a reasonable default, adjust based on your needs
RECAPTCHA_MIN_SCORE = 0.5


def verify_recaptcha(token: Optional[str], action: Optional[str] = None) -> Dict[str, Any]:
    """
    Verify a reCAPTCHA v3 token

    Args:
        token: The reCAPTCHA token from the client
        action: Optional action name to verify (should match client-side action)

    Returns:
        Dict with verification result:
        {
            'success': bool,
            'score': float (0.0 to 1.0),
            'action': str,
            'error': Optional[str]
        }
    """

    # If no secret key is configured, skip verification in development
    if not RECAPTCHA_SECRET_KEY:
        logger.warning("reCAPTCHA secret key not configured, skipping verification")
        return {
            'success': True,
            'score': 1.0,
            'action': action or 'unconfigured',
            'error': None
        }

    # If no token provided, fail verification
    if not token:
        logger.warning("No reCAPTCHA token provided")
        return {
            'success': False,
            'score': 0.0,
            'action': None,
            'error': 'No token provided'
        }

    try:
        # Make verification request to Google
        response = requests.post(
            RECAPTCHA_VERIFY_URL,
            data={
                'secret': RECAPTCHA_SECRET_KEY,
                'response': token
            },
            timeout=5
        )

        result = response.json()

        # Log the verification result
        logger.info(f"reCAPTCHA verification result: success={result.get('success')}, "
                   f"score={result.get('score')}, action={result.get('action')}")

        # Check if verification was successful
        if not result.get('success'):
            error_codes = result.get('error-codes', [])
            logger.warning(f"reCAPTCHA verification failed: {error_codes}")
            return {
                'success': False,
                'score': 0.0,
                'action': result.get('action'),
                'error': ', '.join(error_codes) if error_codes else 'Verification failed'
            }

        # Check score threshold
        score = result.get('score', 0.0)
        if score < RECAPTCHA_MIN_SCORE:
            logger.warning(f"reCAPTCHA score too low: {score} < {RECAPTCHA_MIN_SCORE}")
            return {
                'success': False,
                'score': score,
                'action': result.get('action'),
                'error': f'Score too low: {score}'
            }

        # Check action if specified
        if action and result.get('action') != action:
            logger.warning(f"reCAPTCHA action mismatch: expected {action}, "
                          f"got {result.get('action')}")
            return {
                'success': False,
                'score': score,
                'action': result.get('action'),
                'error': f"Action mismatch: expected {action}"
            }

        # Verification successful
        return {
            'success': True,
            'score': score,
            'action': result.get('action'),
            'error': None
        }

    except requests.exceptions.RequestException as e:
        logger.error(f"Error verifying reCAPTCHA: {e}")
        return {
            'success': False,
            'score': 0.0,
            'action': None,
            'error': f'Verification request failed: {str(e)}'
        }
    except Exception as e:
        logger.error(f"Unexpected error verifying reCAPTCHA: {e}")
        return {
            'success': False,
            'score': 0.0,
            'action': None,
            'error': f'Unexpected error: {str(e)}'
        }


def is_likely_bot(score: float) -> bool:
    """
    Determine if a score indicates likely bot activity

    Args:
        score: reCAPTCHA score (0.0 to 1.0)

    Returns:
        True if likely a bot, False otherwise
    """
    return score < RECAPTCHA_MIN_SCORE