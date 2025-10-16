'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Paper,
  Typography,
  Stack,
  CircularProgress,
  Alert,
  Chip,
} from '@mui/material';
import { CurrencyBitcoin, CheckCircle, Error as ErrorIcon } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { createBTCPayInvoice } from '@/lib/api/payments';
import { useTransactionStatus } from '@/hooks/useTransactionStatus';
import { PaymentRequest } from '@/types/payment';
import { useRouter } from 'next/navigation';

interface BTCPayPaymentProps {
  paymentRequest: PaymentRequest;
  onBack: () => void;
}

export function BTCPayPayment({ paymentRequest, onBack }: BTCPayPaymentProps) {
  const [loading, setLoading] = useState(false);
  const [invoiceId, setInvoiceId] = useState<string | null>(null);
  const [checkoutLink, setCheckoutLink] = useState<string | null>(null);
  const { enqueueSnackbar } = useSnackbar();
  const { status, loading: statusLoading } = useTransactionStatus(invoiceId);
  const router = useRouter();

  const handleCreateInvoice = async () => {
    try {
      setLoading(true);

      // Create BTCPay invoice
      const invoice = await createBTCPayInvoice(paymentRequest);

      setInvoiceId(invoice.invoiceId);
      setCheckoutLink(invoice.checkoutLink);

      enqueueSnackbar('Invoice criada com sucesso!', { variant: 'success' });
    } catch (error) {
      console.error('Error creating BTCPay invoice:', error);
      enqueueSnackbar('Erro ao criar invoice. Tente novamente.', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Redirect on successful payment
  useEffect(() => {
    if (status?.status === 'confirmed') {
      router.push('/checkout/success?transaction=' + invoiceId);
    }
  }, [status, invoiceId, router]);

  const getStatusChip = () => {
    if (!status) return null;

    switch (status.status) {
      case 'confirmed':
        return <Chip icon={<CheckCircle />} label="Pagamento Confirmado" color="success" />;
      case 'failed':
        return <Chip icon={<ErrorIcon />} label="Pagamento Falhou" color="error" />;
      case 'pending':
        return <Chip label="Aguardando Pagamento" color="warning" />;
      default:
        return <Chip label={status.status} />;
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

          {!invoiceId ? (
            <>
              <Alert severity="info" sx={{ width: '100%' }}>
                Clique no botão abaixo para gerar um endereço Bitcoin para pagamento.
              </Alert>

              <Typography variant="body2" color="text.secondary">
                Você receberá um QR code e um endereço Bitcoin para completar o pagamento.
              </Typography>
            </>
          ) : (
            <>
              <Alert severity="success" sx={{ width: '100%' }}>
                Invoice criada com sucesso! Clique no botão abaixo para ver detalhes e completar o pagamento.
              </Alert>

              {status && getStatusChip()}

              {statusLoading && (
                <Box sx={{ py: 2 }}>
                  <CircularProgress size={30} />
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Verificando status do pagamento...
                  </Typography>
                </Box>
              )}

              <Button
                variant="outlined"
                href={checkoutLink || '#'}
                target="_blank"
                rel="noopener noreferrer"
                size="large"
                sx={{ mt: 2 }}
              >
                Abrir Invoice BTCPay
              </Button>
            </>
          )}

          {loading && (
            <Box sx={{ py: 3 }}>
              <CircularProgress size={40} />
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
          disabled={loading || !!invoiceId}
        >
          Voltar
        </Button>
        {!invoiceId && (
          <Button
            variant="contained"
            onClick={handleCreateInvoice}
            size="large"
            disabled={loading}
            sx={{ px: 4 }}
          >
            {loading ? 'Criando Invoice...' : 'Gerar Pagamento Bitcoin'}
          </Button>
        )}
      </Box>
    </Box>
  );
}
