// Common disposable email domains
const DISPOSABLE_DOMAINS = [
  "10minutemail.com",
  "guerrillamail.com",
  "mailinator.com",
  "temp-mail.org",
  "throwawaymail.com",
  "yopmail.com",
  "tempmail.com",
  "disposablemail.com",
  "trashmail.com",
  "fakeinbox.com",
  "mailnesia.com",
  "emailondeck.com",
  "getnada.com",
  "tempinbox.com",
  "sharklasers.com",
  "guerrillamailblock.com",
  "maildrop.cc",
  "mintmail.com",
  "tempr.email",
  "tempmail.net",
  "tmpmail.net",
  "tmpmail.org",
  "moakt.com",
  "dispostable.com",
  "mailcatch.com",
  "mailnull.com",
  "tempmailo.com",
  "emailfake.com",
  "emailtemporanea.net",
  "mytempemail.com",
  "mailsac.com",
  "boun.cr",
  "burnthis.email",
];

/**
 * Check if an email domain is from a disposable email service
 * @param email The email address to check
 * @returns true if the email is from a disposable domain
 */
export function isDisposableEmail(email: string): boolean {
  const domain = email.toLowerCase().split("@")[1];
  if (!domain) return false;

  return DISPOSABLE_DOMAINS.includes(domain);
}

/**
 * Get the domain from an email address
 * @param email The email address
 * @returns The domain part of the email
 */
export function getEmailDomain(email: string): string {
  const parts = email.toLowerCase().split("@");
  return parts.length === 2 ? parts[1] : "";
}