"use client";

import {
  Box,
  Container,
  Typography,
  Button,
  Stack,
  Paper,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { SettingsDoc, LeadDoc } from "@/types/firestore";
import { LeadForm, LeadPayload } from "@/components/forms/LeadForm";
import { useRouter } from "next/navigation";

export default function Home() {
  const theme = useTheme();
  const router = useRouter();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [settings, setSettings] = useState<SettingsDoc | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
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
    } finally {
      setLoading(false);
    }
  };

  const handleLeadSubmit = async (data: LeadPayload) => {
    try {
      // Get UTM parameters from URL
      const urlParams = new URLSearchParams(window.location.search);
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

      {/* Section 1 - Value Proposition */}
      <Box
        sx={{
          py: 10,
          background: "linear-gradient(180deg, #FFFFFF 0%, #F5F5F5 100%)",
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
              Por que Bitcoin?
            </Typography>

            {settings?.images?.[0]?.url && (
              <Box
                sx={{
                  width: "100%",
                  height: { xs: 300, md: 400 },
                  borderRadius: 2,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 10px 40px rgba(255,140,0,0.2)",
                  overflow: "hidden",
                }}
              >
                <img
                  src={settings.images[0].url}
                  alt={settings.images[0].alt}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
              </Box>
            )}

            <Typography
              variant="body1"
              sx={{
                fontSize: "1.125rem",
                lineHeight: 1.8,
                maxWidth: "800px",
                textAlign: "center",
                color: "#333333",
              }}
            >
              Descubra como o Bitcoin representa a verdadeira liberdade financeira,
              permitindo que você tenha controle total sobre seu dinheiro sem
              intermediários. Aprenda sobre autocustódia e soberania individual.
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

            {settings?.images?.[1]?.url && (
              <Box
                sx={{
                  width: "100%",
                  height: { xs: 300, md: 400 },
                  borderRadius: 2,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "2px solid #FF8C00",
                  overflow: "hidden",
                }}
              >
                <img
                  src={settings.images[1].url}
                  alt={settings.images[1].alt}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
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

            {settings?.images?.[2]?.url && (
              <Box
                sx={{
                  width: "100%",
                  maxWidth: 600,
                  height: { xs: 250, md: 350 },
                  borderRadius: 2,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backdropFilter: "blur(10px)",
                  overflow: "hidden",
                  background: "rgba(255,255,255,0.2)",
                }}
              >
                <img
                  src={settings.images[2].url}
                  alt={settings.images[2].alt}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
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

      {/* Lead Form Section */}
      <Box id="lead-form" sx={{ py: 8, backgroundColor: "#F5F5F5" }}>
        <Container maxWidth="sm">
          <Paper elevation={3} sx={{ p: 4 }}>
            <LeadForm onSubmit={handleLeadSubmit} />
          </Paper>
        </Container>
      </Box>
    </>
  );
}