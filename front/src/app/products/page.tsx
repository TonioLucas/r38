'use client';

import {
  Box,
  Container,
  Typography,
  Stack,
  Alert,
} from '@mui/material';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useSnackbar } from 'notistack';
import { ProductGrid } from '@/components/products/ProductGrid';
import { useProducts } from '@/hooks/useProducts';
import { initAffiliateTracking } from '@/lib/utils/affiliate';

export default function ProductsPage() {
  const router = useRouter();
  const { products, loading, error } = useProducts();
  const { enqueueSnackbar } = useSnackbar();

  // Initialize affiliate tracking on page load
  useEffect(() => {
    initAffiliateTracking();
  }, []);

  const handleSelectPrice = (product: any, price: any) => {
    // Check if PIX payment method
    if (price.payment_method === 'pix') {
      enqueueSnackbar('PIX está temporariamente pausado e será liberado em breve. Por favor, escolha outra forma de pagamento.', {
        variant: 'info',
        autoHideDuration: 6000,
      });
      return;
    }

    // Navigate to checkout with product and price IDs
    router.push(`/checkout?product=${product.id}&price=${price.id}`);
  };

  return (
    <>
      {/* Hero Section */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #000000 0%, #1a1a1a 100%)',
          color: '#FFFFFF',
          py: 8,
        }}
      >
        <Container maxWidth="lg">
          <Stack spacing={3} alignItems="center" textAlign="center">
            <Typography
              variant="h1"
              component="h1"
              sx={{
                fontSize: { xs: '2.5rem', md: '3.5rem' },
                fontWeight: 900,
                background: 'linear-gradient(45deg, #FF8C00 30%, #FFD54F 90%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Cursos e Produtos
            </Typography>

            <Typography
              variant="h5"
              component="h2"
              sx={{
                fontSize: { xs: '1.1rem', md: '1.25rem' },
                maxWidth: '800px',
                color: 'rgba(255, 255, 255, 0.9)',
              }}
            >
              Domine Bitcoin, autocustódia e soberania financeira com nossos cursos práticos
            </Typography>
          </Stack>
        </Container>
      </Box>

      {/* Products Section */}
      <Box sx={{ py: 8, backgroundColor: '#F5F5F5' }}>
        <Container maxWidth="lg">
          {error && (
            <Alert severity="error" sx={{ mb: 4 }}>
              Erro ao carregar produtos. Por favor, tente novamente mais tarde.
            </Alert>
          )}

          <ProductGrid
            products={products}
            loading={loading}
            onSelectPrice={handleSelectPrice}
          />
        </Container>
      </Box>

      {/* Footer */}
      <Box
        component="footer"
        sx={{
          py: 4,
          backgroundColor: '#000000',
          color: '#FFFFFF',
        }}
      >
        <Container maxWidth="lg">
          <Typography variant="body2" textAlign="center" sx={{ color: 'rgba(255,255,255,0.6)' }}>
            © {new Date().getFullYear()} R38. Todos os direitos reservados.
          </Typography>
        </Container>
      </Box>
    </>
  );
}
