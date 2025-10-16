"use client";

import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  TextField,
  Stack,
  IconButton,
  InputAdornment,
  CircularProgress,
  Divider,
  Chip,
  Alert,
} from "@mui/material";
import {
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  ContentCopy as CopyIcon,
  VpnKey as KeyIcon,
  Link as LinkIcon,
} from "@mui/icons-material";
import { CustomerDoc } from "@/types/firestore";
import { regeneratePassword, regenerateMagicLink } from "@/lib/api/admin";
import { useSnackbar } from "notistack";

interface CustomerDetailDialogProps {
  customer: CustomerDoc;
  open: boolean;
  onClose: () => void;
}

export function CustomerDetailDialog({ customer, open, onClose }: CustomerDetailDialogProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [regeneratingPassword, setRegeneratingPassword] = useState(false);
  const [regeneratingLink, setRegeneratingLink] = useState(false);
  const [currentPassword, setCurrentPassword] = useState(customer.generated_password || "");
  const [currentMagicLink, setCurrentMagicLink] = useState(customer.magic_login_url || "");
  const { enqueueSnackbar } = useSnackbar();

  const handleCopyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      enqueueSnackbar(`${label} copiado!`, { variant: "success" });
    } catch {
      enqueueSnackbar(`Erro ao copiar ${label}`, { variant: "error" });
    }
  };

  const handleRegeneratePassword = async () => {
    try {
      setRegeneratingPassword(true);
      const _result = await regeneratePassword(customer.id);
      setCurrentPassword(_result.new_password);
      enqueueSnackbar("Senha regenerada com sucesso!", { variant: "success" });
    } catch (error: unknown) {
      console.error("Error regenerating password:", error);
      const message = error instanceof Error ? error.message : "Erro ao regenerar senha";
      enqueueSnackbar(message, { variant: "error" });
    } finally {
      setRegeneratingPassword(false);
    }
  };

  const handleRegenerateMagicLink = async () => {
    try {
      setRegeneratingLink(true);
      const _result = await regenerateMagicLink(customer.id);
      setCurrentMagicLink(_result.magic_login_url);
      enqueueSnackbar("Link mágico regenerado com sucesso!", { variant: "success" });
    } catch (error: unknown) {
      console.error("Error regenerating magic link:", error);
      const message = error instanceof Error ? error.message : "Erro ao regenerar link mágico";
      enqueueSnackbar(message, { variant: "error" });
    } finally {
      setRegeneratingLink(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Detalhes do Cliente</DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          {/* Basic Info */}
          <Box>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Informações Básicas
            </Typography>
            <Stack spacing={2}>
              <TextField
                label="Email"
                value={customer.email}
                fullWidth
                InputProps={{ readOnly: true }}
                size="small"
              />
              <TextField
                label="Nome"
                value={customer.name}
                fullWidth
                InputProps={{ readOnly: true }}
                size="small"
              />
              <TextField
                label="Firebase UID"
                value={customer.id}
                fullWidth
                InputProps={{
                  readOnly: true,
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        onClick={() => handleCopyToClipboard(customer.id, "UID")}
                      >
                        <CopyIcon fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                size="small"
              />
              {customer.astron_member_id && (
                <TextField
                  label="Astron Member ID"
                  value={customer.astron_member_id}
                  fullWidth
                  InputProps={{
                    readOnly: true,
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          size="small"
                          onClick={() =>
                            handleCopyToClipboard(customer.astron_member_id!, "Astron ID")
                          }
                        >
                          <CopyIcon fontSize="small" />
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  size="small"
                />
              )}
            </Stack>
          </Box>

          <Divider />

          {/* Password */}
          <Box>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Senha Gerada
            </Typography>
            <Stack spacing={2}>
              <TextField
                label="Senha"
                value={currentPassword}
                type={showPassword ? "text" : "password"}
                fullWidth
                InputProps={{
                  readOnly: true,
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleCopyToClipboard(currentPassword, "Senha")}
                      >
                        <CopyIcon fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                size="small"
              />
              <Button
                variant="outlined"
                startIcon={regeneratingPassword ? <CircularProgress size={16} /> : <KeyIcon />}
                onClick={handleRegeneratePassword}
                disabled={regeneratingPassword}
                fullWidth
              >
                Regenerar Senha
              </Button>
              {regeneratingPassword && (
                <Alert severity="info" sx={{ fontSize: "0.875rem" }}>
                  Regenerando senha em todos os sistemas (Firebase, Astron, email)...
                </Alert>
              )}
            </Stack>
          </Box>

          <Divider />

          {/* Magic Login URL */}
          <Box>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Link de Login Mágico (Astron)
            </Typography>
            <Stack spacing={2}>
              <TextField
                label="Magic Login URL"
                value={currentMagicLink}
                fullWidth
                multiline
                rows={2}
                InputProps={{
                  readOnly: true,
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        onClick={() => handleCopyToClipboard(currentMagicLink, "Link")}
                      >
                        <CopyIcon fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                size="small"
              />
              <Button
                variant="outlined"
                startIcon={regeneratingLink ? <CircularProgress size={16} /> : <LinkIcon />}
                onClick={handleRegenerateMagicLink}
                disabled={regeneratingLink || !customer.astron_member_id}
                fullWidth
              >
                Regenerar Link Mágico
              </Button>
            </Stack>
          </Box>

          <Divider />

          {/* Active Entitlements */}
          <Box>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Entitlements Ativos
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
              <Chip
                label="Plataforma"
                color={customer.active_entitlements?.platform ? "success" : "default"}
                variant={customer.active_entitlements?.platform ? "filled" : "outlined"}
              />
              <Chip
                label="Suporte"
                color={customer.active_entitlements?.support ? "success" : "default"}
                variant={customer.active_entitlements?.support ? "filled" : "outlined"}
              />
              <Chip
                label="Mentoria"
                color={customer.active_entitlements?.mentorship ? "success" : "default"}
                variant={customer.active_entitlements?.mentorship ? "filled" : "outlined"}
              />
            </Stack>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Fechar</Button>
      </DialogActions>
    </Dialog>
  );
}
