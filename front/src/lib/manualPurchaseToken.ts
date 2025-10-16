import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { ManualPurchaseSettings } from '@/types/firestore';

/**
 * Get manual purchase settings from Firestore
 */
export async function getManualPurchaseSettings(): Promise<ManualPurchaseSettings | null> {
  try {
    const settingsRef = doc(db, 'settings', 'main');
    const settingsSnap = await getDoc(settingsRef);

    if (!settingsSnap.exists()) {
      return null;
    }

    const data = settingsSnap.data();
    return data.manual_purchase ?? null;
  } catch (error) {
    console.error('Error fetching manual purchase settings:', error);
    return null;
  }
}

/**
 * Check if manual purchase override feature is enabled
 */
export async function isManualPurchaseEnabled(): Promise<boolean> {
  const settings = await getManualPurchaseSettings();
  return settings?.enabled ?? false;
}

/**
 * Validate override token against settings
 * Checks:
 * - Feature is enabled
 * - Token matches
 * - Admin email is in whitelist
 */
export async function validateOverrideToken(
  token: string,
  adminEmail: string
): Promise<boolean> {
  const settings = await getManualPurchaseSettings();

  if (!settings || !settings.enabled) {
    return false;
  }

  // Check token matches
  if (settings.override_token !== token) {
    return false;
  }

  // Check admin email in whitelist
  if (!settings.allowed_admin_emails.includes(adminEmail.toLowerCase())) {
    return false;
  }

  return true;
}

/**
 * Generate a random token for override
 */
export function generateOverrideToken(): string {
  // Generate a random UUID-like token
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
