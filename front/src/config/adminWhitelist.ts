// Admin whitelist configuration
// In production, this should be stored in environment variables or Firestore

// Get admin emails from environment variable or use defaults
const getAdminEmails = (): string[] => {
  // Check for environment variable (comma-separated list)
  const envAdmins = process.env.NEXT_PUBLIC_ADMIN_EMAILS;
  if (envAdmins) {
    return envAdmins.split(',').map(email => email.trim().toLowerCase());
  }

  // Default admin emails for development
  // TODO: Replace with actual admin emails in production
  return [
    'admin@renato38.com.br',
    'bitcoinblackpill@gmail.com',
    'renato@trezoitao.com.br'
  ];
};

export const ADMIN_WHITELIST = getAdminEmails();

/**
 * Check if an email is in the admin whitelist
 * @param email The email to check
 * @returns true if the email is whitelisted
 */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_WHITELIST.includes(email.toLowerCase());
}

/**
 * Check if an email can access admin features
 * This could be extended to check Firestore for dynamic admin list
 * @param email The email to check
 * @returns Promise<boolean>
 */
export async function canAccessAdmin(email: string | null | undefined): Promise<boolean> {
  // For now, just check the static whitelist
  // In the future, this could check Firestore for a dynamic admin list
  return isAdminEmail(email);
}