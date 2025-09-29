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
import { CheckCircle as CheckIcon, Download as DownloadIcon, Error as ErrorIcon } from "@mui/icons-material";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { SettingsDoc } from "@/types/firestore";
import { trackEvent, GA_EVENTS } from "@/lib/analytics";
import { executeRecaptcha, RECAPTCHA_ACTIONS } from "@/lib/recaptcha";
import { callFunction } from "@/lib/functions";
import Link from "next/link";

interface GetDownloadLinkRequest {
  email: string;
}

interface GetDownloadLinkResponse {
  ok: boolean;
  downloadUrl?: string;
  expiresIn?: number;
  remainingDownloads?: number;
  error?: string;
  code?: string;
}

function ThankYouPageContent() {
  const searchParams = useSearchParams();
  const [settings, setSettings] = useState<SettingsDoc | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string>("");
  const [downloadStatus, setDownloadStatus] = useState<"idle" | "loading" | "success" | "error" | "rate_limit">("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [remainingDownloads, setRemainingDownloads] = useState<number>(3);
  const [email, setEmail] = useState<string>("");

  useEffect(() => {
    loadSettings();
    // Get email from URL parameters
    const emailParam = searchParams.get("email");
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [searchParams]);

  const loadSettings = async () => {
    try {
      const settingsRef = doc(db, "settings", "main");
      const settingsSnap = await getDoc(settingsRef);

      if (settingsSnap.exists()) {
        const data = settingsSnap.data() as SettingsDoc;
        setSettings(data);
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    }
  };

  const handleDownload = async () => {
    if (!email) {
      setErrorMessage("Email não encontrado. Por favor, tente novamente a partir da página inicial.");
      setDownloadStatus("error");
      return;
    }

    try {
      setDownloadStatus("loading");
      
      // Track download attempt
      trackEvent(GA_EVENTS.EBOOK_DOWNLOAD, {
        source: 'thank_you_page',
        email,
      });

      // Execute reCAPTCHA for download protection
      let recaptchaToken: string | null = null;
      try {
        recaptchaToken = await executeRecaptcha(RECAPTCHA_ACTIONS.DOWNLOAD);
      } catch (recaptchaError) {
        console.warn("reCAPTCHA failed, continuing without token:", recaptchaError);
      }

      // Call backend to get download link
      const response = await callFunction<GetDownloadLinkRequest, GetDownloadLinkResponse>(
        "get_download_link",
        { email }
      );

      if (response.ok && response.downloadUrl) {
        // Success - got download URL
        setDownloadUrl(response.downloadUrl);
        setRemainingDownloads(response.remainingDownloads || 0);
        setDownloadStatus("success");

        // Track successful download link generation
        trackEvent(GA_EVENTS.EBOOK_DOWNLOAD, {
          source: 'thank_you_page',
          email,
          success: true,
          remainingDownloads: response.remainingDownloads,
        });

        // Automatically start download
        window.open(response.downloadUrl, '_blank');
      } else if (response.code === "download_limit_exceeded") {
        // Rate limit reached
        setErrorMessage(response.error || "Limite de downloads atingido. Tente novamente em 24 horas.");
        setDownloadStatus("rate_limit");
        
        trackEvent(GA_EVENTS.EBOOK_DOWNLOAD_LIMIT, {
          email,
          source: 'thank_you_page',
        });
      } else {
        // Other errors
        setErrorMessage(response.error || "Erro ao gerar link de download. Tente novamente.");
        setDownloadStatus("error");
        
        trackEvent(GA_EVENTS.EBOOK_DOWNLOAD, {
          source: 'thank_you_page',
          email,
          error: true,
          errorCode: response.code,
        });
      }
    } catch (error: any) {
      console.error("Error getting download link:", error);
      
      // Handle network or function call errors
      if (error.message?.includes("429") || error.code === "functions/resource-exhausted") {
        setErrorMessage("Limite de downloads atingido. Tente novamente em 24 horas.");
        setDownloadStatus("rate_limit");
        
        trackEvent(GA_EVENTS.EBOOK_DOWNLOAD_LIMIT, {
          email,
          source: 'thank_you_page',
        });
      } else {
        setErrorMessage("Erro ao processar solicitação de download. Tente novamente.");
        setDownloadStatus("error");
      }
      
      trackEvent(GA_EVENTS.EBOOK_DOWNLOAD, {
        source: 'thank_you_page',
        email,
        error: true,
        errorMessage: error.message,
      });
    }
  };

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
          {/* Success/Default State */}
          {(downloadStatus === "idle" || downloadStatus === "success") && (
            <>
              <CheckIcon sx={{ fontSize: 80, color: "success.main" }} />

              <Typography variant="h3" component="h1" fontWeight={700}>
                Obrigado!
              </Typography>

              <Typography variant="h6" color="text.secondary">
                Seu cadastro foi realizado com sucesso
              </Typography>

              <Alert severity="success" sx={{ width: "100%" }}>
                Em breve você receberá um e-mail com o link para download do e-book
                "Bitcoin Red Pill (3ª Edição)".
              </Alert>

              {downloadStatus === "success" && (
                <Alert severity="info" sx={{ width: "100%" }}>
                  Link de download gerado com sucesso! O download deve começar automaticamente.
                  Downloads restantes hoje: {remainingDownloads}
                </Alert>
              )}
            </>
          )}

          {/* Loading State */}
          {downloadStatus === "loading" && (
            <>
              <CircularProgress size={80} />
              
              <Typography variant="h4" component="h1" fontWeight={700}>
                Gerando seu download...
              </Typography>
              
              <Typography variant="body1" color="text.secondary">
                Aguarde enquanto preparamos o link de download do seu e-book.
              </Typography>
            </>
          )}

          {/* Error States */}
          {downloadStatus === "error" && (
            <>
              <ErrorIcon sx={{ fontSize: 80, color: "error.main" }} />
              
              <Typography variant="h4" component="h1" fontWeight={700}>
                Erro no Download
              </Typography>
              
              <Alert severity="error" sx={{ width: "100%" }}>
                {errorMessage}
              </Alert>
            </>
          )}

          {downloadStatus === "rate_limit" && (
            <>
              <ErrorIcon sx={{ fontSize: 80, color: "warning.main" }} />
              
              <Typography variant="h4" component="h1" fontWeight={700}>
                Limite Atingido
              </Typography>
              
              <Alert severity="warning" sx={{ width: "100%" }}>
                {errorMessage}
              </Alert>
              
              <Typography variant="body2" color="text.secondary">
                Você pode tentar novamente em 24 horas ou aguardar o e-mail que será enviado automaticamente.
              </Typography>
            </>
          )}

          {/* General message for all states except loading */}
          {downloadStatus !== "loading" && (
            <Typography variant="body1" color="text.secondary">
              Verifique sua caixa de entrada e, caso não encontre o e-mail,
              verifique também a pasta de spam.
            </Typography>
          )}

          {/* Download Button */}
            <Box sx={{ pt: 2, width: "100%" }}>
              <Button
                fullWidth
                variant="contained"
                color={downloadStatus === "success" ? "success" : "primary"}
                size="large"
                startIcon={downloadStatus === "loading" ? <CircularProgress size={20} /> : <DownloadIcon />}
                onClick={handleDownload}
                disabled={downloadStatus === "loading" || downloadStatus === "rate_limit"}
                sx={{ mb: 2 }}
              >
                {downloadStatus === "loading" && "Gerando Link..."}
                {downloadStatus === "success" && "Baixar Novamente"}
                {downloadStatus === "error" && "Tentar Novamente"}
                {downloadStatus === "rate_limit" && "Limite Atingido"}
                {downloadStatus === "idle" && "Baixar E-book Agora"}
              </Button>

              {downloadStatus !== "rate_limit" && (
                <Typography variant="caption" color="text.secondary">
                  Limite de 3 downloads por e-mail a cada 24 horas
                </Typography>
              )}
            </Box>

          {/* Social Media Section */}
          <Box sx={{ pt: 3, borderTop: 1, borderColor: "divider", width: "100%" }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Enquanto isso, que tal seguir Renato nas redes sociais?
            </Typography>

            <Stack direction="row" spacing={2} justifyContent="center" sx={{ pt: 2 }}>
              <Button
                variant="outlined"
                size="small"
                href="https://x.com/_r38tao"
                target="_blank"
                rel="noopener noreferrer"
              >
                X (Twitter)
              </Button>
              <Button
                variant="outlined"
                size="small"
                href="https://www.instagram.com/r38tao/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Instagram
              </Button>
            </Stack>
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