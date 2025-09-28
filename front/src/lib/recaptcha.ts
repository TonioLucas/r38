// reCAPTCHA v3 Helper
declare global {
  interface Window {
    grecaptcha?: {
      ready: (callback: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
    };
  }
}

// Get reCAPTCHA site key from environment
const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

/**
 * Execute reCAPTCHA v3 and get token
 * @param action The action name for this reCAPTCHA execution
 * @returns Promise with the reCAPTCHA token or null if not configured
 */
export async function executeRecaptcha(action: string): Promise<string | null> {
  // Return null if reCAPTCHA is not configured
  if (!RECAPTCHA_SITE_KEY) {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[reCAPTCHA Mock] Action: ${action} - No site key configured`);
    }
    return null;
  }

  // Return null if grecaptcha is not loaded
  if (typeof window === 'undefined' || !window.grecaptcha) {
    console.warn('[reCAPTCHA] grecaptcha not loaded');
    return null;
  }

  return new Promise((resolve) => {
    window.grecaptcha!.ready(async () => {
      try {
        const token = await window.grecaptcha!.execute(RECAPTCHA_SITE_KEY, {
          action,
        });

        if (process.env.NODE_ENV === 'development') {
          console.log(`[reCAPTCHA] Token generated for action: ${action}`);
        }

        resolve(token);
      } catch (error) {
        console.error('[reCAPTCHA] Error executing:', error);
        resolve(null);
      }
    });
  });
}

/**
 * Check if reCAPTCHA is configured
 * @returns true if reCAPTCHA site key is set
 */
export function isRecaptchaConfigured(): boolean {
  return !!RECAPTCHA_SITE_KEY;
}

/**
 * Get reCAPTCHA site key
 * @returns The site key or undefined
 */
export function getRecaptchaSiteKey(): string | undefined {
  return RECAPTCHA_SITE_KEY;
}

// reCAPTCHA action names as constants
export const RECAPTCHA_ACTIONS = {
  LEAD_SUBMIT: 'lead_submit',
  LOGIN: 'login',
  DOWNLOAD: 'download',
  CONTACT: 'contact',
} as const;