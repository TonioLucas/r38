/**
 * API functions for lead operations
 */

const API_BASE_URL = 'https://us-central1-r38tao-5bdf1.cloudfunctions.net';

export interface CreateCheckoutLeadRequest {
  email: string;
  name: string;
  phone?: string;
  product_id: string;
  price_id: string;
  affiliate_code?: string;
  partner_offer?: {
    partner: string;
    proofUrl: string;
  };
  utm?: {
    firstTouch: Record<string, any>;
    lastTouch: Record<string, any>;
  };
  consent?: {
    lgpdConsent: boolean;
    consentTextVersion: string;
  };
}

export interface CreateCheckoutLeadResponse {
  success: boolean;
  lead_id: string;
}

/**
 * Create a checkout lead for abandonment tracking
 * Called after user completes UserInfo step in checkout
 */
export async function createCheckoutLead(
  data: CreateCheckoutLeadRequest
): Promise<CreateCheckoutLeadResponse> {
  const response = await fetch(`${API_BASE_URL}/create_checkout_lead`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      message: 'Failed to create checkout lead',
    }));
    throw new Error(error.message || 'Failed to create checkout lead');
  }

  return response.json();
}
