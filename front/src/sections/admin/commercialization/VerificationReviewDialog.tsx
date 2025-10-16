"use client";

import { useState } from "react";
import Image from "next/image";
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
  CircularProgress,
  Alert,
  Divider,
  Chip,
} from "@mui/material";
import {
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Image as ImageIcon,
} from "@mui/icons-material";
import { ManualVerificationDoc } from "@/types/firestore";
import { approveVerification, rejectVerification } from "@/lib/api/admin";
import { useSnackbar } from "notistack";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface VerificationReviewDialogProps {
  verification: ManualVerificationDoc;
  open: boolean;
  onClose: () => void;
}

export function VerificationReviewDialog({
  verification,
  open,
  onClose,
}: VerificationReviewDialogProps) {
  const [notes, setNotes] = useState(verification.notes || "");
  const [processing, setProcessing] = useState(false);
  const { enqueueSnackbar } = useSnackbar();

  const isPending = verification.status === "pending";

  const handleApprove = async () => {
    if (!notes.trim()) {
      enqueueSnackbar("Por favor, adicione notas sobre a aprovação", { variant: "warning" });
      return;
    }

    try {
      setProcessing(true);
      const _result = await approveVerification(verification.id, notes);
      enqueueSnackbar("Verificação aprovada! Cliente provisionado com sucesso.", {
        variant: "success",
      });
      onClose();
    } catch (error: unknown) {
      console.error("Error approving verification:", error);
      const message = error instanceof Error ? error.message : "Erro ao aprovar verificação";
      enqueueSnackbar(message, { variant: "error" });
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!notes.trim()) {
      enqueueSnackbar("Por favor, adicione notas explicando a rejeição", { variant: "warning" });
      return;
    }

    try {
      setProcessing(true);
      await rejectVerification(verification.id, notes);
      enqueueSnackbar("Verificação rejeitada", { variant: "success" });
      onClose();
    } catch (error: unknown) {
      console.error("Error rejecting verification:", error);
      const message = error instanceof Error ? error.message : "Erro ao rejeitar verificação";
      enqueueSnackbar(message, { variant: "error" });
    } finally {
      setProcessing(false);
    }
  };

  const formatDate = (date: Date | null): string => {
    if (!date) return "-";
    try {
      return format(date, "dd/MM/yyyy HH:mm", { locale: ptBR });
    } catch {
      return "-";
    }
  };

  const getStatusColor = (
    status: string
  ): "default" | "warning" | "success" | "error" => {
    switch (status) {
      case "pending":
        return "warning";
      case "approved":
        return "success";
      case "rejected":
        return "error";
      default:
        return "default";
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case "pending":
        return "Pendente";
      case "approved":
        return "Aprovado";
      case "rejected":
        return "Rejeitado";
      default:
        return status;
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Revisão de Verificação Manual</Typography>
          <Chip
            label={getStatusLabel(verification.status)}
            color={getStatusColor(verification.status)}
            size="small"
          />
        </Stack>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          {/* Customer Info */}
          <Box>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Informações do Cliente
            </Typography>
            <Stack spacing={2}>
              <TextField
                label="Email"
                value={verification.email}
                fullWidth
                InputProps={{ readOnly: true }}
                size="small"
              />
              <TextField
                label="Data de Submissão"
                value={formatDate(verification.submitted_at)}
                fullWidth
                InputProps={{ readOnly: true }}
                size="small"
              />
            </Stack>
          </Box>

          <Divider />

          {/* Proof Document */}
          <Box>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Documento Comprobatório
            </Typography>
            {verification.upload_url ? (
              <Box
                sx={{
                  border: 1,
                  borderColor: "divider",
                  borderRadius: 1,
                  p: 2,
                  textAlign: "center",
                }}
              >
                {verification.upload_url.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)$/) ? (
                  <Box sx={{ position: "relative", width: "100%", minHeight: "400px" }}>
                    <Image
                      src={verification.upload_url}
                      alt="Proof document"
                      fill
                      style={{ objectFit: "contain" }}
                    />
                  </Box>
                ) : (
                  <Box>
                    <ImageIcon sx={{ fontSize: 48, color: "text.secondary", mb: 2 }} />
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Documento PDF ou outro formato
                    </Typography>
                    <Button
                      variant="outlined"
                      size="small"
                      href={verification.upload_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Abrir Documento
                    </Button>
                  </Box>
                )}
              </Box>
            ) : (
              <Alert severity="warning">Nenhum documento anexado</Alert>
            )}
          </Box>

          <Divider />

          {/* Review Information */}
          {!isPending && (
            <Box>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Informações de Revisão
              </Typography>
              <Stack spacing={2}>
                <TextField
                  label="Revisado Por"
                  value={verification.reviewed_by || "-"}
                  fullWidth
                  InputProps={{ readOnly: true }}
                  size="small"
                />
                <TextField
                  label="Data de Revisão"
                  value={formatDate(verification.reviewed_at)}
                  fullWidth
                  InputProps={{ readOnly: true }}
                  size="small"
                />
                {verification.subscription_created && (
                  <TextField
                    label="Assinatura Criada"
                    value={verification.subscription_created}
                    fullWidth
                    InputProps={{ readOnly: true }}
                    size="small"
                  />
                )}
              </Stack>
            </Box>
          )}

          {/* Admin Notes */}
          <Box>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Notas do Administrador {isPending && "*"}
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={4}
              placeholder="Adicione observações sobre esta verificação..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={!isPending || processing}
              helperText={
                isPending
                  ? "Obrigatório para aprovar ou rejeitar"
                  : "Notas da revisão anterior"
              }
            />
          </Box>

          {processing && (
            <Alert severity="info">
              <Stack direction="row" spacing={2} alignItems="center">
                <CircularProgress size={20} />
                <Typography variant="body2">
                  {verification.status === "pending"
                    ? "Processando aprovação e provisionando cliente..."
                    : "Processando..."}
                </Typography>
              </Stack>
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={processing}>
          {isPending ? "Cancelar" : "Fechar"}
        </Button>
        {isPending && (
          <>
            <Button
              onClick={handleReject}
              color="error"
              variant="outlined"
              startIcon={<RejectIcon />}
              disabled={processing || !notes.trim()}
            >
              Rejeitar
            </Button>
            <Button
              onClick={handleApprove}
              color="success"
              variant="contained"
              startIcon={<ApproveIcon />}
              disabled={processing || !notes.trim()}
            >
              Aprovar
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
