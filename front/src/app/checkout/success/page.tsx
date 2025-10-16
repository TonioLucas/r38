'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Box,
  Container,
  Paper,
  Typography,
  Stack,
  Button,
  CircularProgress,
  Alert,
} from '@mui/material';
import { CheckCircle, Email, CalendarToday } from '@mui/icons-material';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ProductDoc, COLLECTIONS } from '@/types/firestore';
import { formatLaunchDate } from '@/lib/utils/dates';

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const [product, setProduct] = useState<ProductDoc | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const productId = searchParams.get('product');
        const userEmail = searchParams.get('email');

        setEmail(userEmail);

        if (productId) {
          const productDoc = await getDoc(doc(db, COLLECTIONS.PRODUCTS, productId));
          if (productDoc.exists()) {
            setProduct({ id: productDoc.id, ...productDoc.data() } as ProductDoc);
          }
        }
      } catch (error) {
        console.error('Error loading success page data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [searchParams]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress size={60} />
      </Box>
    );
  }

  const isPreSale = product?.status === 'pre_sale';

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#F5F5F5', py: 8 }}>
      <Container maxWidth="md">
        <Paper elevation={3} sx={{ p: { xs: 3, md: 6 } }}>
          <Stack spacing={4} alignItems="center" textAlign="center">
            <CheckCircle sx={{ fontSize: 100, color: 'success.main' }} />

            <Typography variant="h3" fontWeight={700} color="success.main">
              Pagamento Confirmado!
            </Typography>

            {isPreSale ? (
              <>
                <Alert severity="info" sx={{ width: '100%' }}>
                  <Typography variant="body1" fontWeight={600}>
                    Compra Pré-venda Confirmada
                  </Typography>
                </Alert>

                <Stack spacing={2} sx={{ width: '100%', maxWidth: 600 }}>
                  <Box display="flex" gap={2} alignItems="flex-start">
                    <CalendarToday color="primary" />
                    <Box textAlign="left">
                      <Typography variant="body1" fontWeight={600}>
                        Data de Lançamento:
                      </Typography>
                      <Typography variant="body1">
                        {product && formatLaunchDate(product.launch_date)}
                      </Typography>
                    </Box>
                  </Box>

                  <Box display="flex" gap={2} alignItems="flex-start">
                    <Email color="primary" />
                    <Box textAlign="left">
                      <Typography variant="body1" fontWeight={600}>
                        Suas credenciais serão enviadas para:
                      </Typography>
                      <Typography variant="body1" color="primary">
                        {email}
                      </Typography>
                    </Box>
                  </Box>
                </Stack>

                <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 600 }}>
                  Você receberá um email com suas credenciais de acesso na data de lançamento do curso.
                  O email incluirá sua senha temporária e um link de acesso direto à plataforma.
                </Typography>
              </>
            ) : (
              <>
                <Alert severity="success" sx={{ width: '100%' }}>
                  <Typography variant="body1" fontWeight={600}>
                    Suas credenciais foram enviadas!
                  </Typography>
                </Alert>

                <Stack spacing={2} sx={{ width: '100%', maxWidth: 600 }}>
                  <Box display="flex" gap={2} alignItems="flex-start">
                    <Email color="primary" />
                    <Box textAlign="left">
                      <Typography variant="body1" fontWeight={600}>
                        Verifique seu email:
                      </Typography>
                      <Typography variant="body1" color="primary">
                        {email}
                      </Typography>
                    </Box>
                  </Box>
                </Stack>

                <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 600 }}>
                  Enviamos suas credenciais de acesso por email. Verifique sua caixa de entrada (e também o spam)
                  para encontrar sua senha temporária e o link de acesso direto à plataforma.
                </Typography>

                <Alert severity="info" sx={{ width: '100%' }}>
                  O email pode levar alguns minutos para chegar. Se não receber em até 15 minutos,
                  entre em contato com nosso suporte.
                </Alert>
              </>
            )}

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 4 }}>
              <Button
                variant="contained"
                size="large"
                href="/"
                sx={{ px: 4 }}
              >
                Voltar para Início
              </Button>
              <Button
                variant="outlined"
                size="large"
                href="/"
                sx={{ px: 4 }}
              >
                Voltar para Início
              </Button>
            </Stack>
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress size={60} />
      </Box>
    }>
      <CheckoutSuccessContent />
    </Suspense>
  );
}
