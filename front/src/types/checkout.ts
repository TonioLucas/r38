import { ProductDoc, ProductPriceDoc, PaymentMethod } from './firestore';

export interface CheckoutData {
  product: ProductDoc;
  selectedPrice: ProductPriceDoc;
  email: string;
  name: string;
  phone?: string;
  affiliateCode?: string;
}

export interface CheckoutStep {
  label: string;
  description: string;
}

export const CHECKOUT_STEPS: CheckoutStep[] = [
  { label: 'Produto', description: 'Confirme sua seleção' },
  { label: 'Dados', description: 'Informações pessoais' },
  { label: 'Pagamento', description: 'Método de pagamento' },
  { label: 'Finalizar', description: 'Complete o pagamento' },
];
