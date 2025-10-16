import {
  StripeSessionResponse,
  BTCPayInvoiceResponse,
  TransactionStatusResponse,
  PaymentRequest,
} from '@/types/payment';

// Base URL for payment API (adjust based on environment)
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://us-central1-r38tao-5bdf1.cloudfunctions.net';

/**
 * Creates a Stripe checkout session
 * @param request Payment request data
 * @returns Stripe session with checkout URL
 */
export async function createStripeSession(request: PaymentRequest): Promise<StripeSessionResponse> {
  const response = await fetch(`${API_BASE_URL}/create_checkout_session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to create Stripe session' }));
    throw new Error(error.message || 'Failed to create Stripe session');
  }

  return response.json();
}

/**
 * Creates a BTCPay invoice
 * @param request Payment request data
 * @returns BTCPay invoice with checkout link
 */
export async function createBTCPayInvoice(request: PaymentRequest): Promise<BTCPayInvoiceResponse> {
  const response = await fetch(`${API_BASE_URL}/create_btcpay_invoice`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to create BTCPay invoice' }));
    throw new Error(error.message || 'Failed to create BTCPay invoice');
  }

  return response.json();
}

/**
 * Gets transaction status by ID
 * @param transactionId Transaction/payment ID
 * @returns Transaction status
 */
export async function getTransactionStatus(transactionId: string): Promise<TransactionStatusResponse> {
  const response = await fetch(`${API_BASE_URL}/transaction_status/${transactionId}`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to get transaction status' }));
    throw new Error(error.message || 'Failed to get transaction status');
  }

  return response.json();
}
