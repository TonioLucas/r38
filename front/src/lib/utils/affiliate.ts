/**
 * Affiliate tracking utilities
 * Implements 30-day cookie with last-touch attribution
 */

const AFFILIATE_COOKIE_NAME = 'affiliate_code';
const AFFILIATE_COOKIE_DAYS = 30;

/**
 * Sets affiliate code cookie (30-day expiration, last-touch wins)
 * @param code Affiliate tracking code
 */
export function setAffiliateCode(code: string): void {
  if (typeof document === 'undefined') return;

  const maxAge = AFFILIATE_COOKIE_DAYS * 24 * 60 * 60; // 30 days in seconds
  document.cookie = `${AFFILIATE_COOKIE_NAME}=${encodeURIComponent(code)}; max-age=${maxAge}; path=/; SameSite=Lax`;
}

/**
 * Gets current affiliate code from cookie
 * @returns Affiliate code or null if not set
 */
export function getAffiliateCode(): string | null {
  if (typeof document === 'undefined') return null;

  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === AFFILIATE_COOKIE_NAME) {
      return decodeURIComponent(value);
    }
  }
  return null;
}

/**
 * Clears affiliate code cookie
 */
export function clearAffiliateCode(): void {
  if (typeof document === 'undefined') return;

  document.cookie = `${AFFILIATE_COOKIE_NAME}=; max-age=0; path=/`;
}

/**
 * Reads affiliate code from URL query parameter and sets cookie
 * Implements last-touch attribution (overwrites existing cookie)
 * @returns Affiliate code from URL or existing cookie
 */
export function initAffiliateTracking(): string | null {
  if (typeof window === 'undefined') return null;

  // Check for 'ref' query parameter
  const urlParams = new URLSearchParams(window.location.search);
  const refCode = urlParams.get('ref');

  if (refCode) {
    // Last-touch wins: overwrite existing cookie
    setAffiliateCode(refCode);
    return refCode;
  }

  // Return existing cookie if no new ref code
  return getAffiliateCode();
}
