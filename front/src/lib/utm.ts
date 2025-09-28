/**
 * UTM tracking utilities for first-touch and last-touch attribution
 */

export interface UTM {
  source?: string;
  medium?: string;
  campaign?: string;
  term?: string;
  content?: string;
  referrer?: string;
  gclid?: string;
  fbclid?: string;
  timestamp: number;
}

const FIRST_TOUCH_KEY = 'r38_first_touch_utm';
const FIRST_TOUCH_EXPIRY_DAYS = 30;

/**
 * Parse UTM parameters from URL
 */
function parseUTMParams(): Partial<UTM> {
  if (typeof window === 'undefined') return {};

  const params = new URLSearchParams(window.location.search);
  const utm: Partial<UTM> = {};

  // Standard UTM parameters
  if (params.get('utm_source')) utm.source = params.get('utm_source')!;
  if (params.get('utm_medium')) utm.medium = params.get('utm_medium')!;
  if (params.get('utm_campaign')) utm.campaign = params.get('utm_campaign')!;
  if (params.get('utm_term')) utm.term = params.get('utm_term')!;
  if (params.get('utm_content')) utm.content = params.get('utm_content')!;

  // Click IDs for attribution
  if (params.get('gclid')) utm.gclid = params.get('gclid')!;
  if (params.get('fbclid')) utm.fbclid = params.get('fbclid')!;

  // Referrer
  if (document.referrer) {
    utm.referrer = document.referrer;
  }

  return utm;
}

/**
 * Get or set first-touch UTM parameters
 * First-touch is stored in localStorage for persistence across sessions
 */
export function getOrSetFirstTouch(): UTM {
  if (typeof window === 'undefined') {
    return { timestamp: Date.now() };
  }

  try {
    // Check for existing first-touch data
    const stored = localStorage.getItem(FIRST_TOUCH_KEY);

    if (stored) {
      const firstTouch = JSON.parse(stored) as UTM;

      // Check if data is still valid (not expired)
      const expiryTime = FIRST_TOUCH_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
      if (Date.now() - firstTouch.timestamp < expiryTime) {
        return firstTouch;
      }
    }

    // No valid first-touch data, capture new one
    const utm = parseUTMParams();
    const firstTouch: UTM = {
      ...utm,
      timestamp: Date.now(),
    };

    // Only store if we have meaningful data
    if (Object.keys(utm).length > 0 || document.referrer) {
      localStorage.setItem(FIRST_TOUCH_KEY, JSON.stringify(firstTouch));
    }

    return firstTouch;
  } catch (error) {
    console.error('Error accessing localStorage for first-touch:', error);
    return { timestamp: Date.now() };
  }
}

/**
 * Capture current UTM parameters for last-touch attribution
 */
export function captureCurrent(): UTM {
  if (typeof window === 'undefined') {
    return { timestamp: Date.now() };
  }

  const utm = parseUTMParams();

  return {
    ...utm,
    timestamp: Date.now(),
  };
}

/**
 * Clear first-touch data (useful after successful conversion)
 */
export function clearFirstTouch(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(FIRST_TOUCH_KEY);
  } catch (error) {
    console.error('Error clearing first-touch data:', error);
  }
}

/**
 * Get both first-touch and last-touch UTM data
 */
export function getAllUTMData(): { firstTouch: UTM; lastTouch: UTM } {
  return {
    firstTouch: getOrSetFirstTouch(),
    lastTouch: captureCurrent(),
  };
}

/**
 * Initialize UTM tracking on page load
 * This ensures first-touch is captured even if user doesn't submit form
 */
export function initUTMTracking(): void {
  if (typeof window === 'undefined') return;

  // Capture first-touch on page load
  getOrSetFirstTouch();
}