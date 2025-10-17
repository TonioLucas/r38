/**
 * Admin API client for Firebase Callable Functions
 *
 * All admin operations use Firebase Callable Functions with @require_admin decorator
 */

import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";

/**
 * Approve manual verification and trigger customer provisioning
 *
 * @param verificationId - ID of manual_verifications document
 * @param notes - Admin notes about approval
 * @returns Promise with subscription_id and customer data
 */
export async function approveVerification(
  verificationId: string,
  notes: string
): Promise<{
  success: boolean;
  subscription_id: string;
  customer_id: string;
  firebase_uid: string;
  message: string;
}> {
  const callable = httpsCallable<
    { verificationId: string; notes: string },
    { success: boolean; subscription_id: string; customer_id: string; firebase_uid: string; message: string }
  >(functions, "approve_manual_verification");
  const result = await callable({ verificationId, notes });
  return result.data;
}

/**
 * Reject manual verification with notes
 *
 * @param verificationId - ID of manual_verifications document
 * @param notes - Admin notes explaining rejection
 * @returns Promise with success status
 */
export async function rejectVerification(
  verificationId: string,
  notes: string
): Promise<{
  success: boolean;
  message: string;
}> {
  const callable = httpsCallable<
    { verificationId: string; notes: string },
    { success: boolean; message: string }
  >(functions, "reject_manual_verification");
  const result = await callable({ verificationId, notes });
  return result.data;
}

/**
 * Regenerate customer password across all systems
 *
 * Updates Firebase Auth, customer document, Astron Members, and sends email
 *
 * @param customerId - Customer document ID (Firebase UID)
 * @returns Promise with new password
 */
export async function regeneratePassword(customerId: string): Promise<{
  success: boolean;
  new_password: string;
  message: string;
}> {
  const callable = httpsCallable<
    { customerId: string },
    { success: boolean; new_password: string; message: string }
  >(functions, "regenerate_customer_password");
  const result = await callable({ customerId });
  return result.data;
}

/**
 * Regenerate Astron Members magic login URL
 *
 * @param customerId - Customer document ID (Firebase UID)
 * @returns Promise with new magic login URL
 */
export async function regenerateMagicLink(customerId: string): Promise<{
  success: boolean;
  magic_login_url: string;
  message: string;
}> {
  const callable = httpsCallable<
    { customerId: string },
    { success: boolean; magic_login_url: string; message: string }
  >(functions, "regenerate_magic_login_url");
  const result = await callable({ customerId });
  return result.data;
}

/**
 * Extend specific subscription entitlement
 *
 * @param subscriptionId - Subscription document ID
 * @param entitlementType - 'platform' | 'support' | 'mentorship'
 * @param days - Number of days to extend
 * @returns Promise with new expiration date
 */
export async function extendEntitlement(
  subscriptionId: string,
  entitlementType: "platform" | "support" | "mentorship",
  days: number
): Promise<{
  success: boolean;
  new_expiration: string;
  message: string;
}> {
  const callable = httpsCallable<
    { subscriptionId: string; entitlementType: string; days: number },
    { success: boolean; new_expiration: string; message: string }
  >(functions, "extend_subscription_entitlement");
  const result = await callable({ subscriptionId, entitlementType, days });
  return result.data;
}

/**
 * Update manual purchase override settings
 *
 * @param settings - Partial settings to update
 * @returns Promise with success status
 */
export async function updateManualPurchaseSettings(settings: {
  enabled?: boolean;
  override_price_reais?: number;
  rotate_token?: boolean;
  updated_by: string;
}): Promise<{
  success: boolean;
  message: string;
}> {
  const callable = httpsCallable<
    typeof settings,
    { success: boolean; message: string }
  >(functions, "update_manual_purchase_settings");
  const result = await callable(settings);
  return result.data;
}

/**
 * Fetch available ActiveCampaign tags for dropdown selection
 *
 * @returns Promise with list of tags
 */
export async function fetchActiveCampaignTags(): Promise<{
  success: boolean;
  tags: Array<{ id: string; name: string }>;
  error?: string;
}> {
  const callable = httpsCallable<
    void,
    { success: boolean; tags: Array<{ id: string; name: string }>; error?: string }
  >(functions, "fetch_activecampaign_tags");
  const result = await callable();
  return result.data;
}

/**
 * Update ActiveCampaign tag settings
 *
 * @param settings - Tag settings to update
 * @returns Promise with success status
 */
export async function updateActiveCampaignSettings(settings: {
  ebook_tag_name?: string;
  provisioning_tag_name?: string;
  abandoned_checkout_tag_name?: string;
  updated_by: string;
}): Promise<{
  success: boolean;
  message: string;
}> {
  const callable = httpsCallable<
    typeof settings,
    { success: boolean; message: string }
  >(functions, "update_activecampaign_settings");
  const result = await callable(settings);
  return result.data;
}

/**
 * Bulk approve all pending auto-generated manual verifications
 *
 * @returns Promise with approval summary
 */
export async function bulkApproveAutoGeneratedVerifications(): Promise<{
  success_count: number;
  fail_count: number;
  total_processed: number;
  errors: Array<{ verification_id: string; email: string; error: string }>;
  message: string;
}> {
  const callable = httpsCallable<
    void,
    {
      success_count: number;
      fail_count: number;
      total_processed: number;
      errors: Array<{ verification_id: string; email: string; error: string }>;
      message: string;
    }
  >(functions, "bulk_approve_auto_generated_verifications");
  const result = await callable();
  return result.data;
}
