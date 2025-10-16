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
  IconButton,
  Chip,
} from '@mui/material';
import { Pix, ContentCopy, CheckCircle, Error as ErrorIcon } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { createPIXPayment } from '@/lib/api/payments';
import { useTransactionStatus } from '@/hooks/useTransactionStatus';
import { PaymentRequest } from '@/types/payment';
import { useRouter } from 'next/navigation';

interface PIXPaymentProps {
  paymentRequest: PaymentRequest;
  onBack: () => void;
}

export function PIXPayment({ paymentRequest, onBack }: PIXPaymentProps) {
  const [loading, setLoading] = useState(false);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [pixCode, setPixCode] = useState<string | null>(null);
  const [pixQRCode, setPixQRCode] = useState<string | null>(null);
  const { enqueueSnackbar } = useSnackbar();
  const { status, loading: statusLoading } = useTransactionStatus(paymentId);
  const router = useRouter();

  const handleCreatePayment = async () => {
    try {
      setLoading(true);

      // Create PIX payment
      const payment = await createPIXPayment(paymentRequest);

      setPaymentId(payment.paymentId);
      setPixCode(payment.pixCode);
      setPixQRCode(payment.pixQRCode);

      enqueueSnackbar('Código PIX gerado com sucesso!', { variant: 'success' });
    } catch (error) {
      console.error('Error creating PIX payment:', error);
      enqueueSnackbar('Erro ao gerar PIX. Tente novamente.', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleCopyPixCode = () => {
    if (pixCode) {
      navigator.clipboard.writeText(pixCode);
      enqueueSnackbar('Código PIX copiado!', { variant: 'success' });
    }
  };

  // Redirect on successful payment
  useEffect(() => {
    if (status?.status === 'confirmed') {
      router.push('/checkout/success?transaction=' + paymentId);
    }
  }, [status, paymentId, router]);

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
          <Pix sx={{ fontSize: 80, color: '#32BCAD' }} />

          <Typography variant="h5" fontWeight={700}>
            Pagamento com PIX
          </Typography>

          {!paymentId ? (
            <>
              <Alert severity="info" sx={{ width: '100%' }}>
                Clique no botão abaixo para gerar um código PIX para pagamento instantâneo.
              </Alert>

              <Typography variant="body2" color="text.secondary">
                Você receberá um QR code para escanear ou um código para copiar e colar.
              </Typography>
            </>
          ) : (
            <>
              <Alert severity="success" sx={{ width: '100%' }}>
                Código PIX gerado! Escaneie o QR code ou copie o código abaixo para completar o pagamento.
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

              {/* QR Code */}
              {pixQRCode && (
                <Box
                  component="img"
                  src={pixQRCode}
                  alt="PIX QR Code"
                  sx={{
                    width: '100%',
                    maxWidth: 300,
                    height: 'auto',
                    border: '2px solid #32BCAD',
                    borderRadius: 2,
                    p: 2,
                    bgcolor: 'white',
                  }}
                />
              )}

              {/* PIX Code */}
              {pixCode && (
                <Box sx={{ width: '100%' }}>
                  <Typography variant="body2" fontWeight={600} mb={1}>
                    Ou copie o código PIX:
                  </Typography>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2,
                      bgcolor: 'grey.100',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{
                        flexGrow: 1,
                        wordBreak: 'break-all',
                        fontFamily: 'monospace',
                        fontSize: '0.75rem',
                      }}
                    >
                      {pixCode}
                    </Typography>
                    <IconButton
                      onClick={handleCopyPixCode}
                      color="primary"
                      size="small"
                    >
                      <ContentCopy />
                    </IconButton>
                  </Paper>
                </Box>
              )}
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
          disabled={loading || !!paymentId}
        >
          Voltar
        </Button>
        {!paymentId && (
          <Button
            variant="contained"
            onClick={handleCreatePayment}
            size="large"
            disabled={loading}
            sx={{ px: 4 }}
          >
            {loading ? 'Gerando PIX...' : 'Gerar Código PIX'}
          </Button>
        )}
      </Box>
    </Box>
  );
}
