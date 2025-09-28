// GA4 Analytics Helper
declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    dataLayer?: any[];
  }
}

// Get GA4 measurement ID from environment
const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

// Initialize dataLayer if it doesn't exist
if (typeof window !== 'undefined' && !window.dataLayer) {
  window.dataLayer = [];
}

/**
 * Track an event to Google Analytics 4
 * @param eventName The name of the event
 * @param eventParams Optional parameters for the event
 */
export function trackEvent(
  eventName: string,
  eventParams?: Record<string, any>
): void {
  // Only track if gtag is available and measurement ID is set
  if (typeof window !== 'undefined' && window.gtag && GA_MEASUREMENT_ID) {
    try {
      window.gtag('event', eventName, {
        ...eventParams,
        send_to: GA_MEASUREMENT_ID,
      });

      // Log event in development
      if (process.env.NODE_ENV === 'development') {
        console.log(`[GA4] Event: ${eventName}`, eventParams);
      }
    } catch (error) {
      console.error('Error tracking event:', error);
    }
  } else if (process.env.NODE_ENV === 'development') {
    // Log to console in development when GA is not configured
    console.log(`[GA4 Mock] Event: ${eventName}`, eventParams);
  }
}

/**
 * Track a page view
 * @param url Optional URL to track (defaults to current location)
 */
export function trackPageView(url?: string): void {
  if (typeof window !== 'undefined' && window.gtag && GA_MEASUREMENT_ID) {
    window.gtag('config', GA_MEASUREMENT_ID, {
      page_path: url || window.location.pathname,
    });
  }
}

// Pre-defined event names as constants
export const GA_EVENTS = {
  // Lead funnel events
  LEAD_SUBMIT_ATTEMPT: 'lead_submit_attempt',
  LEAD_SUBMIT_SUCCESS: 'lead_submit_success',
  LEAD_SUBMIT_ERROR: 'lead_submit_error',

  // Download events
  EBOOK_DOWNLOAD: 'ebook_download',
  EBOOK_DOWNLOAD_LIMIT: 'ebook_download_limit',

  // Security events
  CAPTCHA_CHALLENGE: 'captcha_challenge',
  CAPTCHA_FAILED: 'captcha_failed',

  // Form interaction events
  FORM_START: 'form_start',
  FORM_FIELD_ERROR: 'form_field_error',

  // Admin events
  ADMIN_LOGIN: 'admin_login',
  ADMIN_LOGOUT: 'admin_logout',
  ADMIN_ACTION: 'admin_action',
} as const;

/**
 * Initialize Google Analytics
 * This should be called once on app initialization
 */
export function initializeGA(): void {
  if (typeof window !== 'undefined' && GA_MEASUREMENT_ID) {
    // Initialize gtag
    window.gtag = function gtag() {
      window.dataLayer?.push(arguments);
    };

    window.gtag('js', new Date());
    window.gtag('config', GA_MEASUREMENT_ID, {
      send_page_view: false, // We'll manually track page views
    });

    console.log('[GA4] Initialized with ID:', GA_MEASUREMENT_ID);
  }
}