import { PaymentStatus, PaymentProvider, PaymentMethod } from './firestore';

// Stripe payment response
export interface StripeSessionResponse {
  sessionId: string;
  checkoutUrl: string;
}

// BTCPay payment response
export interface BTCPayInvoiceResponse {
  invoiceId: string;
  checkoutLink: string;
  btcAmount: string;
  btcAddress?: string;
}

// Note: PIX payments use StripeSessionResponse (same as credit cards)
// PIX is handled via Stripe Checkout with payment_method_types=['card', 'pix']

// Transaction status response
export interface TransactionStatusResponse {
  status: PaymentStatus;
  paymentProvider: PaymentProvider;
  paymentMethod: PaymentMethod;
  transactionId?: string;
  processedAt?: string;
  error?: string;
}

// Payment request payload
export interface PaymentRequest {
  priceId: string;
  email: string;
  name: string;
  phone?: string;
  affiliateCode?: string;
  leadId?: string;
  manualOverrideToken?: string;
  partnerOffer?: {
    partner: string;
    proofUrl: string;
  };
}
