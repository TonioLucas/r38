'use client';

import { useState } from 'react';
import {
  Box,
  Button,
  Paper,
  Typography,
  Stack,
  CircularProgress,
  Alert,
} from '@mui/material';
import { CreditCard } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { createStripeSession } from '@/lib/api/payments';
import { PaymentRequest } from '@/types/payment';

interface StripePaymentProps {
  paymentRequest: PaymentRequest;
  onBack: () => void;
}

export function StripePayment({ paymentRequest, onBack }: StripePaymentProps) {
  const [loading, setLoading] = useState(false);
  const { enqueueSnackbar } = useSnackbar();

  const handlePayment = async () => {
    try {
      setLoading(true);

      // Create Stripe checkout session
      const session = await createStripeSession(paymentRequest);

      // Redirect to Stripe Checkout
      window.location.href = session.checkoutUrl;
    } catch (error) {
      console.error('Error creating Stripe session:', error);
      enqueueSnackbar('Erro ao criar sessão de pagamento. Tente novamente.', { variant: 'error' });
      setLoading(false);
    }
  };

  return (
    <Box>
      <Paper elevation={2} sx={{ p: 4, mb: 3 }}>
        <Stack spacing={3} alignItems="center" textAlign="center">
          <CreditCard sx={{ fontSize: 80, color: 'primary.main' }} />

          <Typography variant="h5" fontWeight={700}>
            Pagamento com Cartão de Crédito
          </Typography>

          <Alert severity="info" sx={{ width: '100%' }}>
            Você será redirecionado para a página segura de pagamento da Stripe para completar sua compra.
          </Alert>

          <Typography variant="body2" color="text.secondary">
            A Stripe é uma plataforma de pagamentos segura e confiável utilizada por milhões de empresas no mundo todo.
          </Typography>

          {loading && (
            <Box sx={{ py: 3 }}>
              <CircularProgress size={40} />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                Redirecionando para pagamento...
              </Typography>
            </Box>
          )}
        </Stack>
      </Paper>

      {/* Navigation Buttons */}
      <Box display="flex" justifyContent="space-between">
        <Button
          variant="outlined"
          onClick={onBack}
          size="large"
          disabled={loading}
        >
          Voltar
        </Button>
        <Button
          variant="contained"
          onClick={handlePayment}
          size="large"
          disabled={loading}
          sx={{ px: 4 }}
        >
          {loading ? 'Redirecionando...' : 'Pagar com Cartão'}
        </Button>
      </Box>
    </Box>
  );
}
