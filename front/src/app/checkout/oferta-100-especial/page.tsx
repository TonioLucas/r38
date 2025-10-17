'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Box, Container, Paper, Alert, CircularProgress, Stepper, Step, StepLabel, useTheme, useMediaQuery } from '@mui/material';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ProductDoc, ProductPriceDoc, COLLECTIONS } from '@/types/firestore';
import { ProductStep } from '@/components/checkout/ProductStep';
import { UserInfoStep } from '@/components/checkout/UserInfoStep';
import { PartnerVerificationStep } from '@/components/checkout/PartnerVerificationStep';
import { ManualVerificationNotice } from '@/components/checkout/ManualVerificationNotice';
import { StripePayment } from '@/components/checkout/StripePayment';
import { BTCPayPayment } from '@/components/checkout/BTCPayPayment';
import { usePartnerOfferCheckout } from '@/hooks/usePartnerOfferCheckout';
import { getAffiliateCode } from '@/lib/utils/affiliate';
import { PaymentRequest } from '@/types/payment';
import { PartnerSource } from '@/types/partner-offer';

// Partner offer checkout steps
const PARTNER_OFFER_STEPS = [
  { label: 'Produto', description: 'Confirme sua seleção' },
  { label: 'Dados', description: 'Informações pessoais' },
  { label: 'Verificação', description: 'Comprovante de compra' },
  { label: 'Aviso', description: 'Processo manual' },
  { label: 'Finalizar', description: 'Complete o pagamento' },
];

function PartnerOfferCheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const {
    activeStep,
    checkoutData,
    setProductAndPrice,
    setUserInfo,
    setPartnerOffer,
    setManualVerificationAgreement,
    setAffiliateCode,
    nextStep,
    prevStep,
    isComplete,
  } = usePartnerOfferCheckout();

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

  const handlePartnerVerificationNext = (partner: PartnerSource, proofUrl: string) => {
    setPartnerOffer(partner, proofUrl);
    nextStep();
  };

  const handleManualNoticeNext = () => {
    setManualVerificationAgreement(true);
    nextStep();
  };

  const handleBackToProducts = () => {
    router.push('/test');
  };

  // Build payment request with partner offer data
  const buildPaymentRequest = (): PaymentRequest => {
    return {
      priceId: checkoutData.selectedPrice!.id,
      email: checkoutData.email!,
      name: checkoutData.name!,
      phone: checkoutData.phone,
      affiliateCode: checkoutData.affiliateCode,
      leadId: checkoutData.leadId,
      partnerOffer: checkoutData.partnerOffer ? {
        partner: checkoutData.partnerOffer.partner,
        proofUrl: checkoutData.partnerOffer.proofUrl,
      } : undefined,
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
          {/* Custom Stepper for Partner Offer Flow */}
          <Box sx={{ width: '100%', mb: 4 }}>
            <Stepper
              activeStep={activeStep}
              alternativeLabel={!isMobile}
              orientation={isMobile ? 'vertical' : 'horizontal'}
            >
              {PARTNER_OFFER_STEPS.map((step) => (
                <Step key={step.label}>
                  <StepLabel>
                    {step.label}
                    {!isMobile && (
                      <Box component="span" sx={{ display: 'block', fontSize: '0.75rem', color: 'text.secondary' }}>
                        {step.description}
                      </Box>
                    )}
                  </StepLabel>
                </Step>
              ))}
            </Stepper>
          </Box>

          {/* Step 0: Product */}
          {activeStep === 0 && (
            <ProductStep
              product={product}
              selectedPrice={selectedPrice}
              onNext={nextStep}
              onBack={handleBackToProducts}
            />
          )}

          {/* Step 1: User Info */}
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

          {/* Step 2: Partner Verification */}
          {activeStep === 2 && checkoutData.email && (
            <PartnerVerificationStep
              email={checkoutData.email}
              onNext={handlePartnerVerificationNext}
              onBack={prevStep}
            />
          )}

          {/* Step 3: Manual Verification Notice */}
          {activeStep === 3 && (
            <ManualVerificationNotice
              onNext={handleManualNoticeNext}
              onBack={prevStep}
            />
          )}

          {/* Step 4: Payment */}
          {activeStep === 4 && isComplete() && (
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

export default function PartnerOfferCheckoutPage() {
  return (
    <Suspense fallback={
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress size={60} />
      </Box>
    }>
      <PartnerOfferCheckoutContent />
    </Suspense>
  );
}
