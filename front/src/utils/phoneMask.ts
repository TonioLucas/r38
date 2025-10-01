// DEPRECATED: This file is no longer used after upgrading to mui-tel-input
// Kept for reference only. Can be safely deleted.

/**
 * Format Brazilian phone number with mask
 * @param value The phone number to format
 * @returns The formatted phone number
 */
export function formatPhoneBR(value: string): string {
  // Remove all non-digits
  const cleanValue = value.replace(/\D/g, "");

  // Apply mask based on length
  if (cleanValue.length <= 2) {
    return cleanValue.replace(/(\d{0,2})/, "($1");
  } else if (cleanValue.length <= 6) {
    return cleanValue.replace(/(\d{2})(\d{0,4})/, "($1) $2");
  } else if (cleanValue.length <= 10) {
    return cleanValue.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3");
  } else {
    return cleanValue.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3");
  }
}

/**
 * Remove mask from phone number
 * @param value The formatted phone number
 * @returns The phone number without formatting
 */
export function unformatPhone(value: string): string {
  return value.replace(/\D/g, "");
}

/**
 * Validate Brazilian phone number
 * @param phone The phone number to validate
 * @returns true if valid
 */
export function isValidPhoneBR(phone: string): boolean {
  const cleanPhone = unformatPhone(phone);
  // Brazilian phone: 10 digits (landline) or 11 digits (mobile)
  return cleanPhone.length === 10 || cleanPhone.length === 11;
}