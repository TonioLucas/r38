/**
 * Server-side dub.co integration helpers
 *
 * These functions are for server-side operations like tracking
 * leads from API routes when needed.
 */

import { cookies } from "next/headers";

/**
 * Get dub_id from cookies (server-side)
 *
 * @returns The dub_id from cookie or null if not present
 */
export async function getDubIdFromCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  const dubId = cookieStore.get('dub_id');
  return dubId?.value || null;
}

/**
 * Clear dub_id cookie after tracking
 *
 * Sets the cookie to expire immediately
 */
export async function clearDubIdCookie() {
  const cookieStore = await cookies();
  cookieStore.set('dub_id', '', {
    maxAge: 0,
    path: '/',
  });
}

/**
 * Track lead conversion from server-side
 *
 * This function would be called from an API route after user signup
 * Note: Most tracking should be done from the backend Python services
 *
 * @param userId - The user's unique ID
 * @param email - The user's email
 * @param name - Optional user name
 * @returns Whether tracking was successful
 */
export async function trackLeadFromServer(
  userId: string,
  email: string,
  name?: string
): Promise<boolean> {
  try {
    const dubId = await getDubIdFromCookie();

    if (!dubId) {
      console.log("No dub_id cookie found, skipping lead tracking");
      return false;
    }

    // Note: In production, this would call the backend API
    // which has the actual dub.co integration
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/track-lead`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        dubId,
        userId,
        email,
        name,
      }),
    });

    if (response.ok) {
      // Clear the cookie after successful tracking
      await clearDubIdCookie();
      return true;
    }

    return false;
  } catch (error) {
    console.error("Failed to track lead:", error);
    return false;
  }
}