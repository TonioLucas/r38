import { ProductPriceDoc } from '@/types/firestore';

/**
 * Formats currency amount in centavos to BRL string
 * @param centavos Amount in centavos (1 real = 100 centavos)
 * @returns Formatted currency string (e.g., "R$ 300,00")
 */
export function formatBRL(centavos: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(centavos / 100);
}

/**
 * Formats installment information for display
 * @param price Product price with installment info
 * @returns Formatted installment string (e.g., "10x de R$ 39,00" or "R$ 300,00 à vista")
 */
export function formatInstallments(price: ProductPriceDoc): string {
  if (price.installments && price.installment_amount) {
    return `${price.installments}x de ${formatBRL(price.installment_amount)}`;
  }
  return `${formatBRL(price.amount)} à vista`;
}

/**
 * Parses BRL currency string to centavos number
 * @param brlString Formatted currency string (e.g., "R$ 300,00")
 * @returns Amount in centavos
 */
export function parseBRL(brlString: string): number {
  // Remove currency symbol, dots (thousand separators), and replace comma with dot
  const cleanedString = brlString
    .replace(/R\$\s?/g, '')
    .replace(/\./g, '')
    .replace(/,/g, '.');

  const reais = parseFloat(cleanedString);
  return Math.round(reais * 100);
}

/**
 * Gets payment method display name in Portuguese
 * @param method Payment method code
 * @returns Display name
 */
export function getPaymentMethodName(method: 'btc' | 'pix' | 'credit_card'): string {
  const names: Record<string, string> = {
    btc: 'Bitcoin',
    pix: 'PIX',
    credit_card: 'Cartão de Crédito',
  };
  return names[method] || method;
}

/**
 * Gets payment method icon name for MUI Icons
 * @param method Payment method code
 * @returns MUI icon name
 */
export function getPaymentMethodIcon(method: 'btc' | 'pix' | 'credit_card'): string {
  const icons: Record<string, string> = {
    btc: 'CurrencyBitcoin',
    pix: 'Pix',
    credit_card: 'CreditCard',
  };
  return icons[method] || 'Payment';
}
