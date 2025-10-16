import { z } from 'zod';

export const productSchema = z.object({
  name: z.string()
    .min(3, 'Nome deve ter no mínimo 3 caracteres')
    .max(200, 'Nome deve ter no máximo 200 caracteres'),

  slug: z.string()
    .min(3, 'Slug deve ter no mínimo 3 caracteres')
    .max(100, 'Slug deve ter no máximo 100 caracteres')
    .regex(/^[a-z0-9-]+$/, 'Slug deve conter apenas letras minúsculas, números e hífens'),

  description: z.string()
    .min(10, 'Descrição deve ter no mínimo 10 caracteres')
    .max(1000, 'Descrição deve ter no máximo 1000 caracteres'),

  status: z.enum(['active', 'pre_sale', 'inactive']),

  launch_date: z.date().nullable(),

  astron_club_id: z.string().min(1, 'ID do clube Astron é obrigatório'),

  base_entitlements: z.object({
    platform_months: z.number().nullable(),
    support_months: z.number().nullable(),
    mentorship_included: z.boolean(),
  }),

  metadata: z.record(z.string(), z.unknown()).optional().default({}),
}).refine(
  (data) => {
    // If status is pre_sale, launch_date is required
    if (data.status === 'pre_sale' && !data.launch_date) {
      return false;
    }
    return true;
  },
  {
    message: 'Data de lançamento é obrigatória para produtos em pré-venda',
    path: ['launch_date'],
  }
);

export const priceSchema = z.object({
  product_id: z.string().min(1, 'ID do produto é obrigatório'),

  payment_method: z.enum(['btc', 'pix', 'credit_card']),

  amount: z.number()
    .min(0, 'Valor deve ser positivo')
    .int('Valor deve ser um inteiro em centavos'),

  display_amount: z.number()
    .min(0, 'Valor de exibição deve ser positivo'),

  currency: z.string()
    .regex(/^BRL$/, 'Moeda deve ser BRL'),

  installments: z.number()
    .min(1, 'Número de parcelas deve ser no mínimo 1')
    .max(12, 'Número de parcelas deve ser no máximo 12')
    .nullable(),

  installment_amount: z.number()
    .min(0, 'Valor da parcela deve ser positivo')
    .nullable(),

  includes_mentorship: z.boolean(),

  active: z.boolean(),
}).refine(
  (data) => {
    // If installments is set, installment_amount must be calculated
    if (data.installments && !data.installment_amount) {
      return false;
    }
    return true;
  },
  {
    message: 'Valor da parcela é obrigatório quando há parcelamento',
    path: ['installment_amount'],
  }
);

export type ProductFormData = z.infer<typeof productSchema>;
export type PriceFormData = z.infer<typeof priceSchema>;
