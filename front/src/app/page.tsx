"use client";

import {
  Box,
  Container,
  Typography,
  Button,
  Stack,
  Paper,
  Chip,
  Switch,
  FormControlLabel,
} from "@mui/material";
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { SettingsDoc } from "@/types/firestore";
import { LeadForm, LeadPayload } from "@/components/forms/LeadForm";
import { useRouter } from "next/navigation";
import { SocialMediaIcons } from "@/components/common/SocialMediaIcons";
import BannerCarousel from "@/components/carousel/BannerCarousel";
import Image from "next/image";
import { initAffiliateTracking } from "@/lib/utils/affiliate";

// Product Card with Mentorship Toggle Component
function ProductCard({
  title,
  subtitle,
  benefits,
  basePrice,
  installmentPrice,
  basePriceLabel = "BTC/PIX",
  isPreSale = false,
  launchDate,
  productSlug,
  gradient = false,
}: {
  title: string;
  subtitle: string;
  benefits: string[];
  basePrice: number;
  installmentPrice: number;
  basePriceLabel?: string;
  isPreSale?: boolean;
  launchDate?: string;
  productSlug: string;
  gradient?: boolean;
}) {
  const [withMentorship, setWithMentorship] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const currentPrice = withMentorship ? basePrice * 2 : basePrice;
  const currentInstallment = withMentorship ? installmentPrice * 2 : installmentPrice;

  return (
    <Paper
      elevation={3}
      sx={{
        p: 4,
        borderRadius: 3,
        background: gradient ? "linear-gradient(135deg, #FF8C00 0%, #FFD54F 100%)" : "#FFFFFF",
        color: gradient ? "#000000" : "inherit",
        border: gradient ? "none" : "2px solid #000000",
        transition: "all 0.3s ease",
        "&:hover": {
          transform: "translateY(-4px)",
          boxShadow: gradient ? "0 12px 40px rgba(255,140,0,0.4)" : "0 12px 40px rgba(0,0,0,0.2)",
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

        <Typography variant="h6" sx={{ opacity: gradient ? 0.9 : 1 }} color={gradient ? "inherit" : "text.secondary"}>
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
        {mounted && (
          <Box
            sx={{
              p: 2,
              borderRadius: 2,
              bgcolor: gradient ? "rgba(0,0,0,0.1)" : "rgba(255,140,0,0.1)",
              border: `2px solid ${withMentorship ? "#FF8C00" : "transparent"}`,
              transition: "all 0.3s ease",
            }}
          >
            <FormControlLabel
              control={
                <Switch
                  checked={withMentorship}
                  onChange={(e) => setWithMentorship(e.target.checked)}
                  sx={{
                    "& .MuiSwitch-switchBase.Mui-checked": {
                      color: "#FF8C00",
                    },
                    "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                      backgroundColor: "#FF8C00",
                    },
                  }}
                />
              }
              label={
                <Box>
                  <Typography variant="body1" fontWeight={600}>
                    Incluir Mentoria Individual
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {withMentorship ? "Mentoria incluída" : "Apenas curso + suporte"}
                  </Typography>
                </Box>
              }
            />
          </Box>
        )}

        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="center">
          <Typography variant="h5" fontWeight={700}>
            R$ {currentPrice.toLocaleString("pt-BR")}
          </Typography>
          <Typography variant="body2" sx={{ opacity: gradient ? 0.8 : 1 }} color={gradient ? "inherit" : "text.secondary"}>
            ou 10x de R$ {currentInstallment.toLocaleString("pt-BR")} no cartão
          </Typography>
        </Stack>

        <Button
          variant="contained"
          size="large"
          href={`/checkout?product=${productSlug}&mentorship=${withMentorship}`}
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
          }}
        >
          {isPreSale ? "Garantir Pré-venda" : "Começar Agora"}
        </Button>
      </Stack>
    </Paper>
  );
}

export default function Home() {
  const router = useRouter();
  const [settings, setSettings] = useState<SettingsDoc | null>(null);

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

            <Stack
              spacing={4}
              sx={{
                width: "100%",
                maxWidth: "900px",
              }}
            >
              {/* Auto Custódia - Pre-sale */}
              <ProductCard
                title="Auto Custódia com RENATO 38"
                subtitle="Treinamento completo do zero para dominar autocustódia de Bitcoin"
                benefits={[
                  "12 meses de acesso à plataforma de aulas",
                  "12 meses de suporte VIP",
                ]}
                basePrice={300}
                installmentPrice={39}
                productSlug="auto-custodia"
                isPreSale={true}
              />

              {/* Lex BTC - Advanced Pre-sale */}
              <ProductCard
                title="Lex BTC"
                subtitle="Treinamento avançado: Multisig, arbitragem e planejamento sucessório"
                benefits={[
                  "12 meses de acesso a partir do lançamento",
                  "Técnicas avançadas de segurança",
                ]}
                basePrice={1500}
                installmentPrice={199.90}
                productSlug="lex-btc"
                isPreSale={true}
              />

              {/* Futuros - Advanced Pre-sale */}
              <ProductCard
                title="Operando Futuros e Derivativos"
                subtitle="Domine operações com futuros e derivativos de Bitcoin"
                benefits={[
                  "12 meses de acesso a partir do lançamento",
                ]}
                basePrice={1500}
                installmentPrice={199.90}
                productSlug="futuros"
                isPreSale={true}
              />
            </Stack>

            <Typography
              variant="body1"
              textAlign="center"
              sx={{
                mt: 4,
                color: "text.secondary",
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
          py: 10,
          background: "#000000",
          color: "#FFFFFF",
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
                color: "#FF8C00",
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
                  borderRadius: 2,
                  border: "2px solid #FF8C00",
                  overflow: "hidden",
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

            <Stack spacing={3} sx={{ maxWidth: "800px", width: "100%" }}>
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  background: "rgba(255,140,0,0.1)",
                  borderLeft: "4px solid #FF8C00",
                }}
              >
                <Typography variant="h6" sx={{ color: "#FF8C00", mb: 1 }}>
                  Fundamentos do Bitcoin
                </Typography>
                <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.8)" }}>
                  Entenda a tecnologia por trás da maior revolução monetária da história
                </Typography>
              </Paper>

              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  background: "rgba(255,213,79,0.1)",
                  borderLeft: "4px solid #FFD54F",
                }}
              >
                <Typography variant="h6" sx={{ color: "#FFD54F", mb: 1 }}>
                  Autocustódia Segura
                </Typography>
                <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.8)" }}>
                  Aprenda a proteger seus bitcoins sem depender de terceiros
                </Typography>
              </Paper>

              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  background: "rgba(255,140,0,0.1)",
                  borderLeft: "4px solid #FF8C00",
                }}
              >
                <Typography variant="h6" sx={{ color: "#FF8C00", mb: 1 }}>
                  Soberania Individual
                </Typography>
                <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.8)" }}>
                  Descubra o caminho para a verdadeira independência financeira
                </Typography>
              </Paper>
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
          </Stack>
        </Container>
      </Box>
    </>
  );
}