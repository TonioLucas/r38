'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Box, Container, Paper, Alert, CircularProgress } from '@mui/material';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ProductDoc, ProductPriceDoc, COLLECTIONS } from '@/types/firestore';
import { CheckoutStepper } from '@/components/checkout/CheckoutStepper';
import { ProductStep } from '@/components/checkout/ProductStep';
import { UserInfoStep } from '@/components/checkout/UserInfoStep';
import { StripePayment } from '@/components/checkout/StripePayment';
import { BTCPayPayment } from '@/components/checkout/BTCPayPayment';
import { useCheckout } from '@/hooks/useCheckout';
import { getAffiliateCode } from '@/lib/utils/affiliate';
import { PaymentRequest } from '@/types/payment';
import { validateOverrideToken } from '@/lib/manualPurchaseToken';
import { useAuth } from '@/auth/useAuth';
import { useSnackbar } from 'notistack';

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const {
    activeStep,
    checkoutData,
    setProductAndPrice,
    setUserInfo,
    setAffiliateCode,
    setManualOverride,
    nextStep,
    prevStep,
    isComplete,
  } = useCheckout();

  // Load product and price from URL params
  useEffect(() => {
    const loadCheckoutData = async () => {
      try {
        const productId = searchParams.get('product');
        const priceId = searchParams.get('price');

        if (!productId || !priceId) {
          setError('Informações do produto não encontradas. Por favor, selecione um produto.');
          setLoading(false);
          return;
        }

        // Fetch product
        const productDoc = await getDoc(doc(db, COLLECTIONS.PRODUCTS, productId));
        if (!productDoc.exists()) {
          setError('Produto não encontrado.');
          setLoading(false);
          return;
        }

        // Fetch price
        const priceDoc = await getDoc(doc(db, COLLECTIONS.PRODUCT_PRICES, priceId));
        if (!priceDoc.exists()) {
          setError('Preço não encontrado.');
          setLoading(false);
          return;
        }

        const product = { id: productDoc.id, ...productDoc.data() } as ProductDoc;
        const price = { id: priceDoc.id, ...priceDoc.data() } as ProductPriceDoc;

        setProductAndPrice(product, price);

        // Set affiliate code if exists
        const affiliateCode = getAffiliateCode();
        setAffiliateCode(affiliateCode);

        // Check for manual override parameter (only once when component mounts)
        const devOverrideToken = searchParams.get('dev_override');
        if (devOverrideToken && user?.email && !checkoutData.manualOverride) {
          const isValid = await validateOverrideToken(devOverrideToken, user.email);
          if (isValid) {
            setManualOverride(devOverrideToken, user.email);
            enqueueSnackbar('Override manual ativado - Preço: R$5.00', {
              variant: 'info',
              autoHideDuration: 5000,
            });
          } else {
            console.warn('Invalid manual override token or unauthorized user');
          }
        }

        setLoading(false);
      } catch (err) {
        console.error('Error loading checkout data:', err);
        setError('Erro ao carregar informações. Por favor, tente novamente.');
        setLoading(false);
      }
    };

    loadCheckoutData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleUserInfoNext = (data: { email: string; name: string; phone?: string }) => {
    setUserInfo(data.email, data.name, data.phone);
    nextStep();
  };

  const handleBackToProducts = () => {
    router.push('/');
  };

  // Build payment request
  const buildPaymentRequest = (): PaymentRequest => {
    return {
      priceId: checkoutData.selectedPrice!.id,
      email: checkoutData.email!,
      name: checkoutData.name!,
      phone: checkoutData.phone,
      affiliateCode: checkoutData.affiliateCode,
      manualOverrideToken: checkoutData.manualOverride?.token,
    };
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ py: 8 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
        <Box display="flex" justifyContent="center">
          <button onClick={handleBackToProducts}>Voltar para Produtos</button>
        </Box>
      </Container>
    );
  }

  const { product, selectedPrice } = checkoutData;

  if (!product || !selectedPrice) {
    return null;
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#F5F5F5', py: 4 }}>
      <Container maxWidth="md">
        <Paper elevation={3} sx={{ p: { xs: 2, md: 4 } }}>
          <CheckoutStepper activeStep={activeStep} />

          {activeStep === 0 && (
            <ProductStep
              product={product}
              selectedPrice={selectedPrice}
              onNext={nextStep}
              onBack={handleBackToProducts}
            />
          )}

          {activeStep === 1 && (
            <UserInfoStep
              initialData={{
                email: checkoutData.email,
                name: checkoutData.name,
                phone: checkoutData.phone,
              }}
              onNext={handleUserInfoNext}
              onBack={prevStep}
            />
          )}

          {activeStep === 2 && isComplete() && (
            <>
              {(selectedPrice.payment_method === 'credit_card' || selectedPrice.payment_method === 'pix') && (
                <StripePayment
                  paymentRequest={buildPaymentRequest()}
                  onBack={prevStep}
                />
              )}

              {selectedPrice.payment_method === 'btc' && (
                <BTCPayPayment
                  paymentRequest={buildPaymentRequest()}
                  onBack={prevStep}
                />
              )}
            </>
          )}
        </Paper>
      </Container>
    </Box>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress size={60} />
      </Box>
    }>
      <CheckoutContent />
    </Suspense>
  );
}
