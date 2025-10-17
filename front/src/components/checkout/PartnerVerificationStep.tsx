'use client';

import { useState } from 'react';
import {
  Box,
  Button,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  LinearProgress,
  Paper,
  Stack,
  Alert,
  Chip,
} from '@mui/material';
import { CloudUpload, PictureAsPdf, Image as ImageIcon, CheckCircle } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import { PARTNER_OPTIONS, PartnerSource } from '@/types/partner-offer';

interface PartnerVerificationStepProps {
  onNext: (partner: PartnerSource, proofUrl: string) => void;
  onBack: () => void;
  email: string; // User email for rate limiting
}

export function PartnerVerificationStep({ onNext, onBack, email }: PartnerVerificationStepProps) {
  const [partner, setPartner] = useState<PartnerSource | ''>('');
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [storagePath, setStoragePath] = useState<string | null>(null);
  const { enqueueSnackbar } = useSnackbar();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    const isValidType =
      selectedFile.type === 'application/pdf' ||
      selectedFile.type.startsWith('image/');

    if (!isValidType) {
      enqueueSnackbar('Selecione um arquivo PDF ou imagem', { variant: 'warning' });
      return;
    }

    // Validate file size
    const maxSize = selectedFile.type === 'application/pdf'
      ? 100 * 1024 * 1024  // 100MB for PDFs
      : 5 * 1024 * 1024;   // 5MB for images

    if (selectedFile.size > maxSize) {
      const maxMB = selectedFile.type === 'application/pdf' ? '100MB' : '5MB';
      enqueueSnackbar(`Arquivo deve ter no máximo ${maxMB}`, { variant: 'warning' });
      return;
    }

    setFile(selectedFile);
    setUploadedUrl(null); // Reset upload state when new file selected
  };

  const handleUpload = async () => {
    if (!file || !partner || !email) return;

    setIsUploading(true);
    setUploadProgress(10);

    try {
      // Step 1: Get signed upload URL from backend (with rate limiting)
      const getUploadUrl = httpsCallable(functions, 'get_upload_url');
      const response = await getUploadUrl({
        email: email,
        file_name: file.name,
        file_size: file.size,
        content_type: file.type,
        partner: partner,
      });

      const { upload_url, file_path, remaining_uploads } = response.data as {
        upload_url: string;
        file_path: string;
        expires_at: string;
        remaining_uploads: number;
      };

      setUploadProgress(30);

      // Step 2: Upload file directly to signed URL using PUT
      const uploadResponse = await fetch(upload_url, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error(`Upload failed with status ${uploadResponse.status}`);
      }

      setUploadProgress(70);

      // Step 3: Construct public download URL (no auth required for reads)
      const downloadUrl = `https://firebasestorage.googleapis.com/v0/b/${process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET}/o/${encodeURIComponent(file_path)}?alt=media`;

      setUploadProgress(100);
      setUploadedUrl(downloadUrl);
      setStoragePath(file_path);

      enqueueSnackbar(
        'Comprovante enviado com sucesso!',
        { variant: 'success' }
      );
    } catch (error: any) {
      console.error('Upload error:', error);

      // Handle rate limit errors specifically
      if (error?.code === 'functions/resource-exhausted') {
        enqueueSnackbar('Limite de uploads excedido. Tente novamente mais tarde.', { variant: 'error' });
      } else if (error?.code === 'functions/invalid-argument') {
        enqueueSnackbar(error.message || 'Dados inválidos. Verifique o arquivo e tente novamente.', { variant: 'error' });
      } else {
        enqueueSnackbar('Erro ao fazer upload. Tente novamente.', { variant: 'error' });
      }

      setUploadProgress(0);
    } finally {
      setIsUploading(false);
    }
  };

  const handleNext = () => {
    if (!partner || !uploadedUrl) return;
    onNext(partner as PartnerSource, uploadedUrl);
  };

  const isValid = !!partner && !!file;
  const canProceed = !!partner && !!uploadedUrl;

  const getFileIcon = () => {
    if (!file) return <CloudUpload />;
    return file.type === 'application/pdf' ? <PictureAsPdf /> : <ImageIcon />;
  };

  const formatFileSize = (bytes: number): string => {
    return (bytes / 1024 / 1024).toFixed(2);
  };

  return (
    <Box>
      <Paper elevation={2} sx={{ p: 4, mb: 3 }}>
        <Stack spacing={3}>
          <Typography variant="h5" fontWeight={700}>
            Verificação de Compra Anterior
          </Typography>

          <Alert severity="info">
            Para confirmar que você comprou de um dos parceiros anteriores, selecione qual parceiro e envie um comprovante de compra.
          </Alert>

          {/* Partner Dropdown */}
          <FormControl fullWidth>
            <InputLabel>De qual parceiro você comprou?</InputLabel>
            <Select
              value={partner}
              label="De qual parceiro você comprou?"
              onChange={(e) => setPartner(e.target.value as PartnerSource)}
              disabled={isUploading}
            >
              {PARTNER_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* File Upload Section */}
          <Box>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
              Comprovante de Compra
            </Typography>
            <Button
              component="label"
              variant="outlined"
              startIcon={getFileIcon()}
              fullWidth
              disabled={isUploading}
              sx={{
                py: 2,
                justifyContent: 'flex-start',
                textTransform: 'none',
              }}
            >
              {file ? file.name : "Selecionar Comprovante (PDF ou Imagem)"}
              <input
                type="file"
                hidden
                accept="application/pdf,image/*"
                onChange={handleFileSelect}
                disabled={isUploading}
              />
            </Button>

            {file && (
              <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Tamanho: {formatFileSize(file.size)} MB
                </Typography>
                {uploadedUrl && (
                  <Chip
                    icon={<CheckCircle />}
                    label="Enviado"
                    color="success"
                    size="small"
                  />
                )}
              </Box>
            )}
          </Box>

          {/* Upload Button */}
          {file && !uploadedUrl && (
            <Button
              variant="contained"
              onClick={handleUpload}
              disabled={!isValid || isUploading}
              fullWidth
            >
              {isUploading ? 'Enviando...' : 'Enviar Comprovante'}
            </Button>
          )}

          {/* Progress Bar */}
          {isUploading && (
            <Box>
              <LinearProgress variant="determinate" value={uploadProgress} />
              <Typography variant="caption" align="center" display="block" sx={{ mt: 1 }}>
                {Math.round(uploadProgress)}%
              </Typography>
            </Box>
          )}
        </Stack>
      </Paper>

      {/* Navigation Buttons */}
      <Box display="flex" justifyContent="space-between">
        <Button
          variant="outlined"
          onClick={onBack}
          size="large"
          disabled={isUploading}
        >
          Voltar
        </Button>
        <Button
          variant="contained"
          onClick={handleNext}
          size="large"
          disabled={!canProceed || isUploading}
          sx={{ px: 4 }}
        >
          Continuar
        </Button>
      </Box>
    </Box>
  );
}
