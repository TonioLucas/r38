import { CheckoutData } from './checkout';

export type PartnerSource = 'batismo-bitcoin' | 'bitcoin-blackpill';

export interface PartnerOfferData {
  partner: PartnerSource;
  proofUrl: string;
}

export interface PartnerVerificationCheckoutData extends CheckoutData {
  partnerOffer?: PartnerOfferData;
  agreedToManualVerification: boolean;
}

export const PARTNER_OPTIONS = [
  { value: 'batismo-bitcoin' as const, label: 'Batismo Bitcoin (Educa Real)' },
  { value: 'bitcoin-blackpill' as const, label: 'Bitcoin Black Pill (Hotmart)' },
] as const;

// WhatsApp contact number for manual verification support
export const WHATSAPP_CONTACT_NUMBER = '16073502604';
export const WHATSAPP_CONTACT_LINK = `https://wa.me/${WHATSAPP_CONTACT_NUMBER}`;
