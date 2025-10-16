'use client';

import {
  Box,
  Typography,
  Paper,
  Stack,
  Button,
  Alert,
} from '@mui/material';
import { CurrencyBitcoin, Pix, CreditCard } from '@mui/icons-material';
import { ProductPriceDoc } from '@/types/firestore';
import { formatInstallments, getPaymentMethodName } from '@/lib/utils/pricing';

interface PaymentMethodStepProps {
  selectedPrice: ProductPriceDoc;
  onNext: () => void;
  onBack: () => void;
}

export function PaymentMethodStep({ selectedPrice, onNext, onBack }: PaymentMethodStepProps) {
  const getPaymentIcon = (method: 'btc' | 'pix' | 'credit_card') => {
    switch (method) {
      case 'btc':
        return <CurrencyBitcoin sx={{ fontSize: 40 }} />;
      case 'pix':
        return <Pix sx={{ fontSize: 40 }} />;
      case 'credit_card':
        return <CreditCard sx={{ fontSize: 40 }} />;
    }
  };

  const getPaymentDescription = (method: 'btc' | 'pix' | 'credit_card') => {
    switch (method) {
      case 'btc':
        return 'Pagamento com Bitcoin via BTCPay Server. Confirmação pode levar alguns minutos.';
      case 'pix':
        return 'Pagamento instantâneo via PIX. Confirmação imediata após pagamento.';
      case 'credit_card':
        return selectedPrice.installments && selectedPrice.installments > 1
          ? `Pagamento parcelado em ${selectedPrice.installments}x no cartão de crédito via Stripe.`
          : 'Pagamento à vista no cartão de crédito via Stripe.';
    }
  };

  return (
    <Box>
      <Paper elevation={2} sx={{ p: 4, mb: 3 }}>
        <Stack spacing={3}>
          <Typography variant="h5" fontWeight={700}>
            Método de Pagamento
          </Typography>

          <Alert severity="info">
            Você selecionou {getPaymentMethodName(selectedPrice.payment_method)} como forma de pagamento.
          </Alert>

          {/* Payment Method Card */}
          <Box
            sx={{
              p: 4,
              borderRadius: 2,
              border: '2px solid',
              borderColor: 'primary.main',
              background: 'linear-gradient(135deg, rgba(255,140,0,0.1) 0%, rgba(255,213,79,0.1) 100%)',
            }}
          >
            <Stack spacing={2} alignItems="center" textAlign="center">
              {getPaymentIcon(selectedPrice.payment_method)}

              <Typography variant="h5" fontWeight={700}>
                {getPaymentMethodName(selectedPrice.payment_method)}
              </Typography>

              <Typography variant="h3" fontWeight={700} color="primary">
                {formatInstallments(selectedPrice)}
              </Typography>

              <Typography variant="body2" color="text.secondary">
                {getPaymentDescription(selectedPrice.payment_method)}
              </Typography>
            </Stack>
          </Box>

          <Alert severity="success">
            Após a confirmação do pagamento, você receberá um email com suas credenciais de acesso e instruções para começar.
          </Alert>
        </Stack>
      </Paper>

      {/* Navigation Buttons */}
      <Box display="flex" justifyContent="space-between">
        <Button
          variant="outlined"
          onClick={onBack}
          size="large"
        >
          Voltar
        </Button>
        <Button
          variant="contained"
          onClick={onNext}
          size="large"
          sx={{ px: 4 }}
        >
          Ir para Pagamento
        </Button>
      </Box>
    </Box>
  );
}
