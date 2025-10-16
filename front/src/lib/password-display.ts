/**
 * Utilities for displaying passwords securely in the UI
 */

/**
 * Format password with visual breaks for readability
 *
 * @param password - Password string (e.g., "cafe-mesa-livro-2024")
 * @returns Formatted password with dots (e.g., "cafe • mesa • livro • 2024")
 */
export function formatPasswordForDisplay(password: string): string {
  // Replace hyphens with bullet points for better visual separation
  return password.replace(/-/g, ' • ');
}

/**
 * Copy text to clipboard with fallback for older browsers
 *
 * @param text - Text to copy
 * @returns True if successful, false otherwise
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    // Try modern clipboard API first
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }

    // Fallback for older browsers or non-secure contexts
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-999999px';
    textarea.style.top = '-999999px';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();

    const successful = document.execCommand('copy');
    document.body.removeChild(textarea);

    return successful;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
}

/**
 * Mask password for partial display
 *
 * @param password - Password to mask
 * @param visibleChars - Number of characters to show at start and end
 * @returns Masked password (e.g., "caf•••••2024")
 */
export function maskPassword(password: string, visibleChars: number = 3): string {
  if (password.length <= visibleChars * 2) {
    // Too short to mask effectively
    return password;
  }

  const start = password.slice(0, visibleChars);
  const end = password.slice(-visibleChars);
  const middleLength = password.length - (visibleChars * 2);
  const dots = '•'.repeat(Math.min(middleLength, 5)); // Max 5 dots

  return `${start}${dots}${end}`;
}

/**
 * Component to display password with copy button
 * Example usage component (React)
 */
export interface PasswordDisplayProps {
  password: string;
  showFull?: boolean;
  onCopy?: () => void;
}

/**
 * Get password strength indicator
 *
 * @param password - Password to evaluate
 * @returns Strength level: 'weak', 'medium', 'strong'
 */
export function getPasswordStrength(password: string): 'weak' | 'medium' | 'strong' {
  // PT-BR generated passwords are always considered strong
  // Format: word-word-word-year (minimum 15 characters)

  if (password.length < 10) return 'weak';
  if (password.length < 15) return 'medium';

  // Check for our pattern: word-word-word-year
  const pattern = /^[a-z]+-[a-z]+-[a-z]+-\d{4}$/;
  if (pattern.test(password)) {
    return 'strong';
  }

  // Fallback checks
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[-_]/.test(password);

  const score = [hasLower, hasNumber, hasSpecial].filter(Boolean).length;

  if (score <= 1) return 'weak';
  if (score === 2) return 'medium';
  return 'strong';
}

/**
 * Generate a secure temporary token for password reset
 *
 * @param length - Length of token to generate
 * @returns Random alphanumeric token
 */
export function generateSecureToken(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const array = new Uint8Array(length);

  if (window.crypto && window.crypto.getRandomValues) {
    window.crypto.getRandomValues(array);
  } else {
    // Fallback for older browsers
    for (let i = 0; i < length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }

  let token = '';
  for (let i = 0; i < length; i++) {
    token += chars[array[i] % chars.length];
  }

  return token;
}