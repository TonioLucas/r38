"use client";

import {
  Box,
  Container,
  Typography,
  Button,
  Stack,
  Paper,
  Chip,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import {
  CreditCard as CreditCardIcon,
  CurrencyBitcoin as BitcoinIcon,
} from "@mui/icons-material";
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { SettingsDoc } from "@/types/firestore";
import { useProducts } from "@/hooks/useProducts";
import { LeadForm, LeadPayload } from "@/components/forms/LeadForm";
import { useRouter } from "next/navigation";
import { SocialMediaIcons } from "@/components/common/SocialMediaIcons";
import BannerCarousel from "@/components/carousel/BannerCarousel";
import Image from "next/image";
import { initAffiliateTracking } from "@/lib/utils/affiliate";
import { PartnerOfferButton } from "@/components/landing/PartnerOfferButton";
import { PartnerOfferCard } from "@/components/landing/PartnerOfferCard";

// Product Card with Mentorship Toggle Component
function ProductCard({
  title,
  subtitle,
  benefits,
  pricing,
  isPreSale = false,
  showMentorship = true,
  productId,
  prices,
  productsLoading = false,
}: {
  title: string;
  subtitle: string;
  benefits: string[];
  pricing: {
    btc: number;
    pix: number;
    card: { total: number; installments: number; installmentValue: number };
  };
  isPreSale?: boolean;
  showMentorship?: boolean;
  productId: string | null;
  prices: Array<{ id: string; includes_mentorship: boolean; payment_method: string; active: boolean }>;
  productsLoading?: boolean;
}) {
  const [withMentorship, setWithMentorship] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<"btc" | "pix" | "card">("btc");

  // Find the correct price ID based on mentorship and payment method
  const getPriceId = (): string | null => {
    const paymentMethodMap: Record<string, string> = {
      btc: 'btc',
      pix: 'pix',
      card: 'credit_card',
    };

    const price = prices.find(p =>
      p.includes_mentorship === withMentorship &&
      p.payment_method === paymentMethodMap[selectedPayment] &&
      p.active === true
    );

    return price?.id || null;
  };

  const priceId = getPriceId();

  const currentPricing = {
    btc: withMentorship ? pricing.btc * 2 : pricing.btc,
    pix: withMentorship ? pricing.pix * 2 : pricing.pix,
    card: {
      total: withMentorship ? pricing.card.total * 2 : pricing.card.total,
      installments: pricing.card.installments,
      installmentValue: withMentorship ? pricing.card.installmentValue * 2 : pricing.card.installmentValue,
    },
  };

  return (
    <Paper
      elevation={3}
      sx={{
        p: 4,
        borderRadius: 3,
        background: "#FFFFFF",
        color: "#000000",
        border: "2px solid #000000",
        transition: "all 0.3s ease",
        "&:hover": {
          transform: "translateY(-4px)",
          boxShadow: "0 12px 40px rgba(0,0,0,0.2)",
        },
      }}
    >
      <Stack spacing={3}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={1}>
          <Typography variant="h4" fontWeight={700}>
            {title}
          </Typography>
          {isPreSale && (
            <Chip
              label="PRÉ-VENDA"
              sx={{
                backgroundColor: "#FF8C00",
                color: "#FFFFFF",
                fontWeight: 700,
                fontSize: "0.875rem",
                px: 2,
                py: 0.5,
              }}
            />
          )}
        </Box>

        <Typography variant="h6" sx={{ opacity: 0.7 }} color="#333333">
          {subtitle}
        </Typography>

        <Stack spacing={1}>
          {benefits.map((benefit, index) => (
            <Typography key={index} variant="body1" sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              ✓ {benefit}
            </Typography>
          ))}
        </Stack>

        {/* Mentorship Toggle */}
        {showMentorship && (
          <ToggleButtonGroup
            value={withMentorship ? "com" : "sem"}
            exclusive
            onChange={(e, newValue) => {
              if (newValue !== null) {
                setWithMentorship(newValue === "com");
              }
            }}
            aria-label="mentoria"
            fullWidth
            sx={{
              "& .MuiToggleButton-root": {
                py: 1.5,
                textTransform: "none",
                fontSize: "0.95rem",
                fontWeight: 500,
                borderColor: "#e0e0e0",
                color: "#666666",
                "&.Mui-selected": {
                  backgroundColor: "#FF8C00",
                  color: "#FFFFFF",
                  fontWeight: 600,
                  "&:hover": {
                    backgroundColor: "#FF7A00",
                  },
                },
                "&:hover": {
                  backgroundColor: "rgba(255,140,0,0.08)",
                },
              },
            }}
          >
            <ToggleButton value="sem">
              Curso + Suporte
            </ToggleButton>
            <ToggleButton value="com">
              + Mentoria
            </ToggleButton>
          </ToggleButtonGroup>
        )}

        {/* Payment Method Selector */}
        <Stack spacing={2}>
          <Typography variant="subtitle2" color="#666666" fontWeight={600}>
            Escolha a forma de pagamento:
          </Typography>
          <ToggleButtonGroup
            value={selectedPayment}
            exclusive
            onChange={(e, newValue) => {
              if (newValue !== null) {
                setSelectedPayment(newValue);
              }
            }}
            aria-label="payment method"
            fullWidth
            sx={{
              "& .MuiToggleButton-root": {
                py: 1,
                px: 1,
                textTransform: "none",
                fontSize: "0.85rem",
                fontWeight: 500,
                borderColor: "#e0e0e0",
                color: "#666666",
                flexDirection: "column",
                gap: 0.5,
                "&.Mui-selected": {
                  backgroundColor: "#000000",
                  color: "#FFFFFF",
                  fontWeight: 600,
                  "&:hover": {
                    backgroundColor: "#1a1a1a",
                  },
                },
                "&:hover": {
                  backgroundColor: "rgba(0,0,0,0.04)",
                },
              },
            }}
          >
            <ToggleButton value="btc">
              <BitcoinIcon sx={{ fontSize: 20, mb: 0.5 }} />
              <Typography
                variant="body2"
                fontWeight={700}
                sx={{
                  color: withMentorship ? "#FF8C00" : "inherit",
                  transition: "color 0.3s ease"
                }}
              >
                R$ {currentPricing.btc.toLocaleString("pt-BR")}
              </Typography>
            </ToggleButton>
            <ToggleButton value="pix">
              <Typography sx={{ fontSize: 14, fontWeight: 800, mb: 0.5 }}>PIX</Typography>
              <Typography
                variant="body2"
                fontWeight={700}
                sx={{
                  color: withMentorship ? "#FF8C00" : "inherit",
                  transition: "color 0.3s ease"
                }}
              >
                R$ {currentPricing.pix.toLocaleString("pt-BR")}
              </Typography>
            </ToggleButton>
            <ToggleButton value="card">
              <CreditCardIcon sx={{ fontSize: 20, mb: 0.5 }} />
              <Typography
                variant="body2"
                fontWeight={700}
                sx={{
                  color: withMentorship ? "#FF8C00" : "inherit",
                  transition: "color 0.3s ease"
                }}
              >
                {currentPricing.card.installments}x R$ {currentPricing.card.installmentValue.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Typography>
            </ToggleButton>
          </ToggleButtonGroup>
        </Stack>

        <Button
          variant="contained"
          size="large"
          href={productId && priceId ? `/checkout?product=${productId}&price=${priceId}` : '#'}
          disabled={!productId || !priceId || productsLoading}
          sx={{
            py: 2,
            fontSize: "1.125rem",
            fontWeight: 700,
            backgroundColor: "#000000",
            color: "#FFFFFF",
            textTransform: "none",
            "&:hover": {
              backgroundColor: "#1a1a1a",
            },
            "&.Mui-disabled": {
              backgroundColor: "#cccccc",
              color: "#666666",
            },
          }}
        >
          {productsLoading ? "Carregando..." : (isPreSale ? "Garantir Pré-venda" : "Começar Agora")}
        </Button>
      </Stack>
    </Paper>
  );
}

export default function Home() {
  const router = useRouter();
  const [settings, setSettings] = useState<SettingsDoc | null>(null);
  const [showPartnerOffer, setShowPartnerOffer] = useState(false);
  const { products, loading: productsLoading } = useProducts();

  useEffect(() => {
    loadSettings();
    // Initialize affiliate tracking on landing page
    initAffiliateTracking();
  }, []);

  const loadSettings = async () => {
    try {
      const settingsRef = doc(db, "settings", "main");
      const settingsSnap = await getDoc(settingsRef);

      if (settingsSnap.exists()) {
        setSettings(settingsSnap.data() as SettingsDoc);
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    }
  };

  const handleLeadSubmit = async (data: LeadPayload) => {
    try {
      // Call the HTTP endpoint directly
      const functionsUrl = 'https://us-central1-r38tao-5bdf1.cloudfunctions.net/create_lead';

      // Prepare the payload for the function
      const payload = {
        name: data.name,
        email: data.email.toLowerCase(),
        phone: data.phone || null,
        recaptchaToken: data.recaptchaToken,
        utm_source: data.utm?.lastTouch?.source || data.utm?.firstTouch?.source || null,
        utm_medium: data.utm?.lastTouch?.medium || data.utm?.firstTouch?.medium || null,
        utm_campaign: data.utm?.lastTouch?.campaign || data.utm?.firstTouch?.campaign || null,
        utm_term: data.utm?.lastTouch?.term || data.utm?.firstTouch?.term || null,
        utm_content: data.utm?.lastTouch?.content || data.utm?.firstTouch?.content || null,
        lgpd_consent: data.lgpdConsent,
      };

      // Submit the lead through the HTTP endpoint
      const response = await fetch(functionsUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to submit lead' }));
        throw new Error(error.message || error.error || 'Failed to submit lead');
      }

      const result = await response.json();

      // Check if successful
      if (!result.success) {
        throw new Error(result.message || 'Failed to submit lead');
      }

      // Redirect to thank you page with email parameter
      router.push(`/obrigado?email=${encodeURIComponent(data.email.toLowerCase())}`);
    } catch (error) {
      console.error("Error saving lead:", error);
      throw error;
    }
  };

  const headline = settings?.hero?.headline || "Soberania começa com conhecimento.";
  const subheadline = settings?.hero?.subheadline ||
    "Baixe grátis o e-book 'Bitcoin Red Pill (3ª Edição)' e entenda, sem rodeios, os fundamentos do Bitcoin e da autocustódia.";
  const ctaText = settings?.hero?.ctaText || "Baixar e-book grátis";

  return (
    <>
      {/* Hero Section */}
      <Box
        sx={{
          minHeight: "100vh",
          background: "linear-gradient(135deg, #000000 0%, #1a1a1a 100%)",
          color: "#FFFFFF",
          display: "flex",
          alignItems: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background Pattern */}
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            opacity: 0.1,
            background: `repeating-linear-gradient(
              45deg,
              #FF8C00,
              #FF8C00 10px,
              transparent 10px,
              transparent 20px
            )`,
          }}
        />

        <Container maxWidth="lg" sx={{ position: "relative", zIndex: 1 }}>
          <Stack spacing={4} alignItems="center" textAlign="center">
            {/* Hero Image - Always visible if exists */}
            {settings?.images?.[0]?.url && (
              <Box
                sx={{
                  position: 'relative',
                  width: '100%',
                  aspectRatio: '3/4',
                  maxWidth: { xs: 300, sm: 400, md: 500 },
                  borderRadius: 2,
                  overflow: 'hidden',
                  boxShadow: "0 10px 40px rgba(255,140,0,0.3)",
                }}
              >
                <Image
                  src={settings.images[0].url}
                  alt={settings.images[0].alt}
                  fill
                  priority
                  sizes="(max-width: 600px) 100vw, (max-width: 1200px) 80vw, 500px"
                  style={{ objectFit: "cover" }}
                />
              </Box>
            )}

            {/* Text Content - Always visible below image */}
            <Typography
              variant="h1"
              component="h1"
              sx={{
                fontSize: { xs: "2.5rem", md: "3.5rem", lg: "4rem" },
                fontWeight: 900,
                lineHeight: 1.1,
                mb: 2,
                background: "linear-gradient(45deg, #FF8C00 30%, #FFD54F 90%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                textShadow: "0 0 30px rgba(255,140,0,0.3)",
              }}
            >
              {headline}
            </Typography>

            <Typography
              variant="h5"
              component="h2"
              sx={{
                fontSize: { xs: "1.1rem", md: "1.25rem" },
                fontWeight: 400,
                lineHeight: 1.6,
                maxWidth: "800px",
                color: "rgba(255, 255, 255, 0.9)",
                mb: 3,
              }}
            >
              {subheadline}
            </Typography>

            {/* CTA Button */}
            <Button
              variant="contained"
              color="primary"
              size="large"
              sx={{
                fontSize: "1.125rem",
                py: 1.5,
                px: 4,
                fontWeight: 700,
                boxShadow: "0 4px 20px rgba(255,140,0,0.4)",
                "&:hover": {
                  transform: "translateY(-2px)",
                  boxShadow: "0 6px 30px rgba(255,140,0,0.6)",
                },
                transition: "all 0.3s ease",
              }}
              href="#lead-form"
            >
              {ctaText}
            </Button>
          </Stack>
        </Container>
      </Box>

      {/* Section - Courses/Products */}
      <Box
        sx={{
          py: 10,
          background: "#FFFFFF",
        }}
      >
        <Container maxWidth="lg">
          <Stack spacing={6} alignItems="center">
            <Typography
              variant="h2"
              component="h3"
              textAlign="center"
              sx={{
                fontSize: { xs: "2rem", md: "2.5rem" },
                fontWeight: 700,
                color: "#000000",
                mb: 2,
              }}
            >
              Nossos Treinamentos
            </Typography>

            <Typography
              variant="h6"
              textAlign="center"
              sx={{
                maxWidth: "800px",
                color: "text.secondary",
                mb: 2,
              }}
            >
              Escolha o treinamento ideal para o seu nível de conhecimento
            </Typography>

            {/* Partner Offer CTA Button */}
            <PartnerOfferButton
              isVisible={showPartnerOffer}
              onToggle={() => setShowPartnerOffer(!showPartnerOffer)}
            />

            {/* Partner Offer Card - Collapsible */}
            {showPartnerOffer && (
              <Box
                sx={{
                  width: "100%",
                  maxWidth: "900px",
                  mb: 4,
                  animation: "fadeIn 0.3s ease-in",
                  "@keyframes fadeIn": {
                    from: { opacity: 0, transform: "translateY(-10px)" },
                    to: { opacity: 1, transform: "translateY(0)" },
                  },
                }}
              >
                {productsLoading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                    <Typography>Carregando oferta...</Typography>
                  </Box>
                ) : products.length > 0 ? (
                  (() => {
                    // Find the Auto-Custodia product (or first product)
                    const product = products[0];

                    // Find R$100 prices (amount = 10000 centavos)
                    const partnerPrices = product.prices.filter(p => p.amount === 10000 && p.active);

                    // Build benefits
                    const benefits: string[] = [];
                    if (product.base_entitlements.platform_months) {
                      benefits.push(`${product.base_entitlements.platform_months} meses de acesso à plataforma`);
                    } else {
                      benefits.push('Acesso vitalício à plataforma');
                    }
                    if (product.base_entitlements.support_months) {
                      benefits.push(`${product.base_entitlements.support_months} meses de suporte`);
                    }

                    return (
                      <PartnerOfferCard
                        title={product.name}
                        subtitle="Oferta especial para clientes de ex-parceiros"
                        benefits={benefits}
                        productId={product.id}
                        prices={partnerPrices}
                        productsLoading={productsLoading}
                      />
                    );
                  })()
                ) : (
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                    <Typography>Oferta não disponível no momento.</Typography>
                  </Box>
                )}
              </Box>
            )}

            <Stack
              spacing={4}
              sx={{
                width: "100%",
                maxWidth: "900px",
              }}
            >
              {productsLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                  <Typography>Carregando produtos...</Typography>
                </Box>
              ) : products.length === 0 ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                  <Typography>Nenhum produto disponível no momento.</Typography>
                </Box>
              ) : (
                products.map((product) => {
                  // Exclude R$100 special offer products from regular product list
                  const hasSpecialOffer = product.prices.some(p => p.amount === 10000 && p.active);
                  if (hasSpecialOffer) {
                    return null; // Skip this product as it's shown in partner offer card
                  }

                  // Find prices for this product
                  const basePrices = product.prices.filter((p) => !p.includes_mentorship);
                  const btcPrice = basePrices.find((p) => p.payment_method === 'btc');
                  const pixPrice = basePrices.find((p) => p.payment_method === 'pix');
                  const cardPrice = basePrices.find((p) => p.payment_method === 'credit_card');

                  // Build benefits array
                  const benefits: string[] = [];
                  if (product.base_entitlements.platform_months) {
                    benefits.push(`${product.base_entitlements.platform_months} meses de acesso à plataforma`);
                  } else {
                    benefits.push('Acesso vitalício à plataforma');
                  }
                  if (product.base_entitlements.support_months) {
                    benefits.push(`${product.base_entitlements.support_months} meses de suporte`);
                  }

                  return (
                    <ProductCard
                      key={product.id}
                      title={product.name}
                      subtitle={product.description}
                      benefits={benefits}
                      pricing={{
                        btc: btcPrice?.display_amount || 0,
                        pix: pixPrice?.display_amount || 0,
                        card: {
                          total: cardPrice?.display_amount || 0,
                          installments: cardPrice?.installments || 1,
                          installmentValue: cardPrice?.installment_amount ? cardPrice.installment_amount / 100 : 0,
                        },
                      }}
                      isPreSale={product.status === 'pre_sale'}
                      showMentorship={!product.base_entitlements.mentorship_included}
                      productId={product.id}
                      prices={product.prices}
                      productsLoading={productsLoading}
                    />
                  );
                })
              )}
            </Stack>

            <Typography
              variant="body1"
              textAlign="center"
              sx={{
                mt: 4,
                color: "#333333",
                fontWeight: 500,
              }}
            >
              💳 Pagamento via Bitcoin (BTC), PIX ou Cartão de Crédito
            </Typography>
          </Stack>
        </Container>
      </Box>

      {/* Section 2 - About the E-book */}
      <Box
        sx={{
          py: 12,
          background: "#0a0a0a",
        }}
      >
        <Container maxWidth="lg">
          <Stack spacing={8} alignItems="center">
            <Typography
              variant="h2"
              component="h2"
              textAlign="center"
              sx={{
                fontSize: { xs: "2.5rem", md: "3.5rem" },
                fontWeight: 900,
                color: "#FF8C00",
                mb: 2,
              }}
            >
              O que você vai aprender
            </Typography>

            {settings?.images?.[2]?.url && (
              <Box
                sx={{
                  position: 'relative',
                  width: "100%",
                  aspectRatio: '16/9',
                  maxWidth: { xs: "100%", md: 1200 },
                  borderRadius: 3,
                  border: "3px solid #FF8C00",
                  overflow: "hidden",
                  boxShadow: "0 10px 30px rgba(255, 140, 0, 0.2)",
                }}
              >
                <Image
                  src={settings.images[2].url}
                  alt={settings.images[2].alt}
                  fill
                  sizes="(max-width: 600px) 100vw, (max-width: 1200px) 80vw, 1200px"
                  style={{ objectFit: "contain" }}
                />
              </Box>
            )}

            <Stack spacing={4} sx={{ maxWidth: "900px", width: "100%" }}>
              {/* Card 1 - Fundamentos */}
              <Box
                sx={{
                  p: 5,
                  backgroundColor: "#1a1a1a",
                  borderRadius: 2,
                  borderLeft: "6px solid #FF8C00",
                  "&:hover": {
                    backgroundColor: "#252525",
                    transition: "background-color 0.3s ease",
                  },
                }}
              >
                <Typography
                  component="h3"
                  sx={{
                    fontSize: "1.75rem",
                    fontWeight: 700,
                    color: "#FF8C00",
                    mb: 2,
                  }}
                >
                  📚 Fundamentos do Bitcoin
                </Typography>
                <Typography
                  sx={{
                    fontSize: "1.25rem",
                    color: "#e0e0e0",
                    lineHeight: 1.6,
                  }}
                >
                  Entenda a tecnologia por trás da maior revolução monetária da história
                </Typography>
              </Box>

              {/* Card 2 - Autocustódia */}
              <Box
                sx={{
                  p: 5,
                  backgroundColor: "#1a1a1a",
                  borderRadius: 2,
                  borderLeft: "6px solid #FFD54F",
                  "&:hover": {
                    backgroundColor: "#252525",
                    transition: "background-color 0.3s ease",
                  },
                }}
              >
                <Typography
                  component="h3"
                  sx={{
                    fontSize: "1.75rem",
                    fontWeight: 700,
                    color: "#FFD54F",
                    mb: 2,
                  }}
                >
                  🔐 Autocustódia Segura
                </Typography>
                <Typography
                  sx={{
                    fontSize: "1.25rem",
                    color: "#e0e0e0",
                    lineHeight: 1.6,
                  }}
                >
                  Aprenda a proteger seus bitcoins sem depender de terceiros
                </Typography>
              </Box>

              {/* Card 3 - Soberania */}
              <Box
                sx={{
                  p: 5,
                  backgroundColor: "#1a1a1a",
                  borderRadius: 2,
                  borderLeft: "6px solid #FF8C00",
                  "&:hover": {
                    backgroundColor: "#252525",
                    transition: "background-color 0.3s ease",
                  },
                }}
              >
                <Typography
                  component="h3"
                  sx={{
                    fontSize: "1.75rem",
                    fontWeight: 700,
                    color: "#FF8C00",
                    mb: 2,
                  }}
                >
                  👑 Soberania Individual
                </Typography>
                <Typography
                  sx={{
                    fontSize: "1.25rem",
                    color: "#e0e0e0",
                    lineHeight: 1.6,
                  }}
                >
                  Descubra o caminho para a verdadeira independência financeira
                </Typography>
              </Box>
            </Stack>
          </Stack>
        </Container>
      </Box>

      {/* Section 3 - CTA */}
      <Box
        sx={{
          py: 10,
          background: "linear-gradient(135deg, #FF8C00 0%, #FFD54F 100%)",
        }}
      >
        <Container maxWidth="lg">
          <Stack spacing={6} alignItems="center">
            <Typography
              variant="h2"
              component="h3"
              textAlign="center"
              sx={{
                fontSize: { xs: "2rem", md: "2.5rem" },
                fontWeight: 700,
                color: "#000000",
              }}
            >
              Comece sua jornada hoje
            </Typography>

            {settings?.images?.[3]?.url && (
              <Box
                sx={{
                  position: 'relative',
                  width: "100%",
                  maxWidth: 600,
                  aspectRatio: '1/1',
                  borderRadius: 2,
                  backdropFilter: "blur(10px)",
                  overflow: "hidden",
                  background: "rgba(255,255,255,0.2)",
                }}
              >
                <Image
                  src={settings.images[3].url}
                  alt={settings.images[3].alt}
                  fill
                  sizes="(max-width: 600px) 100vw, 600px"
                  style={{ objectFit: "cover" }}
                />
              </Box>
            )}

            <Typography
              variant="h5"
              sx={{
                fontSize: { xs: "1.25rem", md: "1.5rem" },
                fontWeight: 500,
                textAlign: "center",
                maxWidth: "600px",
                color: "#000000",
              }}
            >
              Junte-se a milhares de brasileiros que já descobriram o poder do Bitcoin
            </Typography>

            <Button
              variant="contained"
              size="large"
              sx={{
                fontSize: "1.25rem",
                py: 2,
                px: 5,
                fontWeight: 700,
                backgroundColor: "#000000",
                color: "#FFFFFF",
                "&:hover": {
                  backgroundColor: "#1a1a1a",
                  transform: "translateY(-2px)",
                },
                boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
                transition: "all 0.3s ease",
              }}
              href="#lead-form"
            >
              {ctaText}
            </Button>
          </Stack>
        </Container>
      </Box>

      {/* Banner Carousel Section - Above Lead Form */}
      {settings?.banners && settings.banners.length > 0 && (
        <Box sx={{ pt: 0.1, pb: 0.1, backgroundColor: "#F5F5F5" }}>
          <Container maxWidth="lg">
            <BannerCarousel banners={settings.banners} />
          </Container>
        </Box>
      )}

      {/* Lead Form Section */}
      <Box id="lead-form" sx={{ pt: settings?.banners && settings.banners.length > 0 ? 0.1 : 8, pb: 8, backgroundColor: "#F5F5F5" }}>
        <Container maxWidth="sm">
          <Paper elevation={3} sx={{ p: 4 }}>
            <LeadForm onSubmit={handleLeadSubmit} />
          </Paper>
        </Container>
      </Box>

      {/* Footer with Social Media Icons */}
      <Box
        component="footer"
        sx={{
          py: 6,
          backgroundColor: "#000000",
          color: "#FFFFFF",
        }}
      >
        <Container maxWidth="lg">
          <Stack spacing={4} alignItems="center">
            <Typography variant="h6" sx={{ color: "#FF8C00" }}>
              Siga o Renato nas redes sociais
            </Typography>
            <SocialMediaIcons
              instagramUrl="https://www.instagram.com/r38tao/"
              xUrl="https://x.com/_r38tao"
            />

            {/* Support Contact Section */}
            <Box
              sx={{
                mt: 4,
                pt: 4,
                borderTop: "1px solid rgba(255,255,255,0.2)",
                width: "100%",
                textAlign: "center",
              }}
            >
              <Typography variant="h6" sx={{ color: "#FF8C00", mb: 2 }}>
                Suporte e Contato
              </Typography>
              <Stack spacing={1}>
                <Typography variant="body1" sx={{ color: "rgba(255,255,255,0.9)" }}>
                  📧 Email: suporte@r38.com.br
                </Typography>
                <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.6)", mt: 1 }}>
                  Respondemos em até 24 horas úteis
                </Typography>
              </Stack>
            </Box>

            <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.6)", mt: 2 }}>
              © {new Date().getFullYear()} R38. Todos os direitos reservados.
            </Typography>

            {/* Test Version Link */}
            <Box
              sx={{
                mt: 3,
                pt: 3,
                borderTop: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <Button
                variant="outlined"
                size="small"
                href="/test"
                sx={{
                  borderColor: "#FF8C00",
                  color: "#FF8C00",
                  "&:hover": {
                    borderColor: "#FFD54F",
                    backgroundColor: "rgba(255,140,0,0.1)",
                  },
                }}
              >
                🧪 Testar Nova Versão (Beta)
              </Button>
              <Typography variant="caption" display="block" sx={{ color: "rgba(255,255,255,0.4)", mt: 1 }}>
                Experimente nossa nova plataforma de cursos
              </Typography>
            </Box>
          </Stack>
        </Container>
      </Box>
    </>
  );
}