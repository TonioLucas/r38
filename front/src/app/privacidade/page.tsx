"use client";

import { useState, useEffect } from "react";
import {
  Box,
  Container,
  Typography,
  Paper,
  Skeleton,
  Alert,
} from "@mui/material";
import { Construction as ConstructionIcon } from "@mui/icons-material";
import { pageOperations } from "@/lib/firestore";
import { PageDoc } from "@/types/firestore";

export default function PrivacyPage() {
  const [privacyPage, setPrivacyPage] = useState<PageDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPrivacyPage();
  }, []);

  const loadPrivacyPage = async () => {
    try {
      setLoading(true);
      setError(null);
      const page = await pageOperations.getById("privacy");
      setPrivacyPage(page);
    } catch (error) {
      console.error("Error loading privacy page:", error);
      setError("Erro ao carregar a página de privacidade");
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Paper elevation={1} sx={{ p: 4 }}>
          <Skeleton variant="text" height={60} sx={{ mb: 3 }} />
          <Skeleton variant="text" height={40} sx={{ mb: 2 }} />
          <Skeleton variant="rectangular" height={400} />
        </Paper>
      </Container>
    );
  }

  // Error state
  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  // Page disabled or doesn't exist
  if (!privacyPage || !privacyPage.enabled) {
    return (
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Paper elevation={1} sx={{ p: 6, textAlign: "center" }}>
          <ConstructionIcon sx={{ fontSize: 80, color: "text.secondary", mb: 3 }} />
          <Typography variant="h4" component="h1" gutterBottom color="text.secondary">
            Página em Construção
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Esta página está sendo preparada e estará disponível em breve.
          </Typography>
        </Paper>
      </Container>
    );
  }

  // Render privacy policy content
  return (
    <Container maxWidth="lg" sx={{ py: 8 }}>
      <Paper elevation={1} sx={{ p: { xs: 3, md: 6 } }}>
        <Typography 
          variant="h3" 
          component="h1" 
          gutterBottom
          sx={{ 
            fontWeight: 700,
            color: "primary.main",
            mb: 4 
          }}
        >
          {privacyPage.title || "Política de Privacidade"}
        </Typography>
        
        <Box
          sx={{
            "& p": {
              mb: 2,
              lineHeight: 1.7,
              fontSize: "1rem",
            },
            "& h1, & h2, & h3, & h4, & h5, & h6": {
              mt: 3,
              mb: 2,
              fontWeight: 600,
            },
            "& ul, & ol": {
              mb: 2,
              pl: 3,
            },
            "& li": {
              mb: 1,
              lineHeight: 1.6,
            },
            "& strong": {
              fontWeight: 600,
            },
            "& em": {
              fontStyle: "italic",
            },
            "& a": {
              color: "primary.main",
              textDecoration: "underline",
              "&:hover": {
                textDecoration: "none",
              },
            },
          }}
        >
          {/* Render markdown-like content */}
          {privacyPage.content.split('\n').map((paragraph, index) => {
            // Skip empty lines
            if (!paragraph.trim()) return null;
            
            // Handle headers
            if (paragraph.startsWith('# ')) {
              return (
                <Typography key={index} variant="h4" component="h2" sx={{ mt: 4, mb: 2, fontWeight: 600 }}>
                  {paragraph.replace('# ', '')}
                </Typography>
              );
            }
            if (paragraph.startsWith('## ')) {
              return (
                <Typography key={index} variant="h5" component="h3" sx={{ mt: 3, mb: 2, fontWeight: 600 }}>
                  {paragraph.replace('## ', '')}
                </Typography>
              );
            }
            if (paragraph.startsWith('### ')) {
              return (
                <Typography key={index} variant="h6" component="h4" sx={{ mt: 3, mb: 1, fontWeight: 600 }}>
                  {paragraph.replace('### ', '')}
                </Typography>
              );
            }
            
            // Handle regular paragraphs
            return (
              <Typography key={index} variant="body1" paragraph>
                {paragraph}
              </Typography>
            );
          })}
        </Box>

        <Box sx={{ mt: 6, pt: 3, borderTop: 1, borderColor: "divider" }}>
          <Typography variant="caption" color="text.secondary">
            Última atualização: {privacyPage.updatedAt?.toDate?.()?.toLocaleDateString('pt-BR') || 'N/A'}
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
}
