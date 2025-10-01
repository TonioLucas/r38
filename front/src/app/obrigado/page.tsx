"use client";

import {
  Container,
  Typography,
  Button,
  Box,
  Paper,
  Stack,
  Alert,
  CircularProgress,
  IconButton,
} from "@mui/material";
import { CheckCircle as CheckIcon, Error as ErrorIcon, Close as CloseIcon } from "@mui/icons-material";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { SocialMediaIcons } from "@/components/common/SocialMediaIcons";

function ThankYouPageContent() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState<string>("");

  useEffect(() => {
    // Get email from URL parameters
    const emailParam = searchParams.get("email");
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [searchParams]);

  // Show warning if no email found
  if (!email) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #000000 0%, #1a1a1a 100%)',
          py: 8,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <Container maxWidth="sm">
          <Paper
            elevation={3}
            sx={{
              p: 4,
              position: 'relative',
              background: 'rgba(26, 26, 26, 0.8)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 140, 0, 0.2)',
            }}
          >
            {/* Close Button */}
            <IconButton
              component={Link}
              href="/"
              aria-label="Fechar e voltar ao início"
              sx={{
                position: 'absolute',
                top: 16,
                right: 16,
                color: 'common.white',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                },
              }}
            >
              <CloseIcon />
            </IconButton>

            <Stack spacing={3} alignItems="center" textAlign="center">
              <ErrorIcon sx={{ fontSize: 80, color: "#FF8C00" }} />

              <Typography variant="h4" component="h1" fontWeight={700} color="common.white">
                Email não encontrado
              </Typography>

              <Alert severity="warning" sx={{ width: "100%" }}>
                Não foi possível identificar seu email. Por favor, volte à página inicial e preencha o formulário novamente.
              </Alert>

              <Button
                component={Link}
                href="/"
                variant="contained"
                color="primary"
                size="large"
              >
                ← Voltar ao início
              </Button>
            </Stack>
          </Paper>
        </Container>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #000000 0%, #1a1a1a 100%)',
        py: 8,
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={3}
          sx={{
            p: 4,
            position: 'relative',
            background: 'rgba(26, 26, 26, 0.8)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 140, 0, 0.2)',
          }}
        >
          {/* Close Button */}
          <IconButton
            component={Link}
            href="/"
            aria-label="Fechar e voltar ao início"
            sx={{
              position: 'absolute',
              top: 16,
              right: 16,
              color: 'common.white',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
              },
            }}
          >
            <CloseIcon />
          </IconButton>

          <Stack spacing={3} alignItems="center" textAlign="center">
            <CheckIcon sx={{ fontSize: 80, color: "#4caf50" }} />

            <Typography variant="h3" component="h1" fontWeight={700} color="common.white">
              Obrigado por se cadastrar!
            </Typography>

            <Typography variant="h6" color="common.white">
              Enviamos o e-book "Bitcoin Red Pill (3ª Edição)" para <strong>{email || 'seu e-mail'}</strong>
            </Typography>

            <Alert severity="warning" sx={{ width: "100%", mt: 2 }}>
              <Typography variant="body1" fontWeight={600}>
                IMPORTANTE: Verifique sua pasta de SPAM/LIXO ELETRÔNICO!
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                O e-mail pode ter sido direcionado para lá. Se encontrar, marque como "não é spam" para receber futuras comunicações.
              </Typography>
            </Alert>

            {/* Social Media Section */}
            <Box sx={{ pt: 3, borderTop: 1, borderColor: "rgba(255, 255, 255, 0.2)", width: "100%" }}>
              <Typography variant="body2" color="common.white" gutterBottom>
                Enquanto isso, que tal seguir Renato nas redes sociais?
              </Typography>

              <Box sx={{ pt: 2 }}>
                <SocialMediaIcons
                  instagramUrl="https://www.instagram.com/r38tao/"
                  xUrl="https://x.com/_r38tao"
                />
              </Box>
            </Box>

            {/* Back to Home */}
            <Box sx={{ pt: 2 }}>
              <Button
                component={Link}
                href="/"
                variant="text"
                sx={{ color: 'common.white', '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' } }}
              >
                ← Voltar ao início
              </Button>
            </Box>
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
}

// Wrapper component with Suspense boundary
export default function ThankYouPage() {
  return (
    <Suspense
      fallback={
        <Box
          sx={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #000000 0%, #1a1a1a 100%)',
            py: 8,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <Container maxWidth="sm">
            <Paper
              elevation={3}
              sx={{
                p: 4,
                background: 'rgba(26, 26, 26, 0.8)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 140, 0, 0.2)',
              }}
            >
              <Stack spacing={3} alignItems="center" textAlign="center">
                <CircularProgress size={80} sx={{ color: '#FF8C00' }} />
                <Typography variant="h4" component="h1" fontWeight={700} color="common.white">
                  Carregando...
                </Typography>
              </Stack>
            </Paper>
          </Container>
        </Box>
      }
    >
      <ThankYouPageContent />
    </Suspense>
  );
}