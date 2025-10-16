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
import { CurrencyBitcoin } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { createBTCPayInvoice } from '@/lib/api/payments';
import { PaymentRequest } from '@/types/payment';

interface BTCPayPaymentProps {
  paymentRequest: PaymentRequest;
  onBack: () => void;
}

export function BTCPayPayment({ paymentRequest, onBack }: BTCPayPaymentProps) {
  const [loading, setLoading] = useState(false);
  const { enqueueSnackbar } = useSnackbar();

  const handlePayment = async () => {
    try {
      setLoading(true);

      // Create BTCPay invoice
      const invoice = await createBTCPayInvoice(paymentRequest);

      // Redirect to BTCPay Checkout (like Stripe)
      window.location.href = invoice.checkoutLink;
    } catch (error) {
      console.error('Error creating BTCPay invoice:', error);
      enqueueSnackbar('Erro ao criar invoice. Tente novamente.', { variant: 'error' });
      setLoading(false);
    }
  };

  return (
    <Box>
      <Paper elevation={2} sx={{ p: 4, mb: 3 }}>
        <Stack spacing={3} alignItems="center" textAlign="center">
          <CurrencyBitcoin sx={{ fontSize: 80, color: '#FF8C00' }} />

          <Typography variant="h5" fontWeight={700}>
            Pagamento com Bitcoin
          </Typography>

          <Alert severity="info" sx={{ width: '100%' }}>
            Você será redirecionado para a página segura de pagamento BTCPay para completar sua compra.
          </Alert>

          <Typography variant="body2" color="text.secondary">
            BTCPay é uma plataforma de pagamentos Bitcoin de código aberto e auto-hospedada.
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

      <Box display="flex" justifyContent="space-between">
        <Button variant="outlined" onClick={onBack} size="large" disabled={loading}>
          Voltar
        </Button>
        <Button
          variant="contained"
          onClick={handlePayment}
          size="large"
          disabled={loading}
          sx={{ px: 4 }}
        >
          {loading ? 'Redirecionando...' : 'Pagar com Bitcoin'}
        </Button>
      </Box>
    </Box>
  );
}
