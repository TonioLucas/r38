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
} from "@mui/material";
import { CheckCircle as CheckIcon, Error as ErrorIcon } from "@mui/icons-material";
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
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Stack spacing={3} alignItems="center" textAlign="center">
            <ErrorIcon sx={{ fontSize: 80, color: "warning.main" }} />
            
            <Typography variant="h4" component="h1" fontWeight={700}>
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
    );
  }

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Stack spacing={3} alignItems="center" textAlign="center">
          <CheckIcon sx={{ fontSize: 80, color: "success.main" }} />

          <Typography variant="h3" component="h1" fontWeight={700}>
            Obrigado por se cadastrar!
          </Typography>

          <Typography variant="h6" color="text.secondary">
            Enviamos o e-book para <strong>{email || 'seu e-mail'}</strong>
          </Typography>

          <Alert severity="success" sx={{ width: "100%" }}>
            Você receberá o e-book "Bitcoin Red Pill (3ª Edição)" em seu e-mail em breve.
          </Alert>

          <Typography variant="body1" color="text.secondary">
            Verifique sua caixa de entrada e também a pasta de spam.
          </Typography>

          <Typography variant="body2" color="text.secondary">
            Não recebeu? Entre em contato conosco.
          </Typography>

          {/* Social Media Section */}
          <Box sx={{ pt: 3, borderTop: 1, borderColor: "divider", width: "100%" }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
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
              color="primary"
            >
              ← Voltar ao início
            </Button>
          </Box>
        </Stack>
      </Paper>
    </Container>
  );
}

// Wrapper component with Suspense boundary
export default function ThankYouPage() {
  return (
    <Suspense 
      fallback={
        <Container maxWidth="sm" sx={{ py: 8 }}>
          <Paper elevation={3} sx={{ p: 4 }}>
            <Stack spacing={3} alignItems="center" textAlign="center">
              <CircularProgress size={80} />
              <Typography variant="h4" component="h1" fontWeight={700}>
                Carregando...
              </Typography>
            </Stack>
          </Paper>
        </Container>
      }
    >
      <ThankYouPageContent />
    </Suspense>
  );
}