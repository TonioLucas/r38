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
  Divider,
  Chip,
  CircularProgress,
} from "@mui/material";
import { Schedule as ScheduleIcon } from "@mui/icons-material";
import { SubscriptionDoc } from "@/types/firestore";
import { extendEntitlement } from "@/lib/api/admin";
import { useSnackbar } from "notistack";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface SubscriptionDetailDialogProps {
  subscription: SubscriptionDoc;
  open: boolean;
  onClose: () => void;
}

export function SubscriptionDetailDialog({
  subscription,
  open,
  onClose,
}: SubscriptionDetailDialogProps) {
  const [extendDays, setExtendDays] = useState<number>(30);
  const [extendType, setExtendType] = useState<"platform" | "support" | "mentorship">("support");
  const [extending, setExtending] = useState(false);
  const { enqueueSnackbar } = useSnackbar();

  const formatDate = (date: Date | null): string => {
    if (!date) return "Vitalício";
    try {
      return format(date, "dd/MM/yyyy HH:mm", { locale: ptBR });
    } catch {
      return "-";
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(amount / 100);
  };

  const handleExtendEntitlement = async () => {
    if (!extendDays || extendDays <= 0) {
      enqueueSnackbar("Insira um número válido de dias", { variant: "warning" });
      return;
    }

    try {
      setExtending(true);
      const _result = await extendEntitlement(subscription.id, extendType, extendDays);
      enqueueSnackbar(
        `Entitlement ${extendType} estendido por ${extendDays} dias`,
        { variant: "success" }
      );
      // Dialog will reload data on close
      onClose();
    } catch (error: unknown) {
      console.error("Error extending entitlement:", error);
      const message = error instanceof Error ? error.message : "Erro ao estender entitlement";
      enqueueSnackbar(message, { variant: "error" });
    } finally {
      setExtending(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Detalhes da Assinatura</DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          {/* Basic Info */}
          <Box>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Informações Básicas
            </Typography>
            <Stack spacing={2}>
              <TextField
                label="ID da Assinatura"
                value={subscription.id}
                fullWidth
                InputProps={{ readOnly: true }}
                size="small"
              />
              <TextField
                label="ID do Cliente"
                value={subscription.customer_id}
                fullWidth
                InputProps={{ readOnly: true }}
                size="small"
              />
              <TextField
                label="Produto"
                value={subscription.product_id}
                fullWidth
                InputProps={{ readOnly: true }}
                size="small"
              />
              <Stack direction="row" spacing={2}>
                <TextField
                  label="Status"
                  value={subscription.status}
                  fullWidth
                  InputProps={{ readOnly: true }}
                  size="small"
                />
                <TextField
                  label="Valor Pago"
                  value={formatCurrency(subscription.amount_paid)}
                  fullWidth
                  InputProps={{ readOnly: true }}
                  size="small"
                />
              </Stack>
              <Stack direction="row" spacing={2}>
                <TextField
                  label="Método de Pagamento"
                  value={subscription.payment_method}
                  fullWidth
                  InputProps={{ readOnly: true }}
                  size="small"
                />
                <TextField
                  label="Provedor"
                  value={subscription.payment_provider}
                  fullWidth
                  InputProps={{ readOnly: true }}
                  size="small"
                />
              </Stack>
            </Stack>
          </Box>

          <Divider />

          {/* Entitlements */}
          <Box>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Entitlements (Acessos)
            </Typography>
            <Stack spacing={2}>
              {/* Platform */}
              <Box sx={{ p: 2, border: 1, borderColor: "divider", borderRadius: 1 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Plataforma
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Expira em: {formatDate(subscription.entitlements?.platform?.expires_at)}
                </Typography>
                {subscription.entitlements?.platform?.courses && (
                  <Typography variant="caption" color="text.secondary">
                    Cursos: {subscription.entitlements.platform.courses.join(", ") || "Nenhum"}
                  </Typography>
                )}
              </Box>

              {/* Support */}
              {subscription.entitlements?.support && (
                <Box sx={{ p: 2, border: 1, borderColor: "divider", borderRadius: 1 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Suporte
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Expira em: {formatDate(subscription.entitlements.support.expires_at)}
                  </Typography>
                </Box>
              )}

              {/* Mentorship */}
              {subscription.entitlements?.mentorship && (
                <Box sx={{ p: 2, border: 1, borderColor: "divider", borderRadius: 1 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Mentoria
                  </Typography>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Chip
                      label={subscription.entitlements.mentorship.enabled ? "Ativo" : "Inativo"}
                      color={subscription.entitlements.mentorship.enabled ? "success" : "default"}
                      size="small"
                    />
                    <Typography variant="body2" color="text.secondary">
                      Expira em: {formatDate(subscription.entitlements.mentorship.expires_at)}
                    </Typography>
                  </Stack>
                </Box>
              )}
            </Stack>
          </Box>

          <Divider />

          {/* Affiliate Data */}
          {subscription.affiliate_data && (
            <Box>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Dados de Afiliado
              </Typography>
              <Stack spacing={2}>
                <TextField
                  label="Afiliado ID"
                  value={subscription.affiliate_data.affiliate_id}
                  fullWidth
                  InputProps={{ readOnly: true }}
                  size="small"
                />
                <Stack direction="row" spacing={2}>
                  <TextField
                    label="Comissão (%)"
                    value={subscription.affiliate_data.commission_percentage}
                    fullWidth
                    InputProps={{ readOnly: true }}
                    size="small"
                  />
                  <TextField
                    label="Valor da Comissão"
                    value={formatCurrency(subscription.affiliate_data.commission_amount)}
                    fullWidth
                    InputProps={{ readOnly: true }}
                    size="small"
                  />
                  <TextField
                    label="Status"
                    value={subscription.affiliate_data.commission_status}
                    fullWidth
                    InputProps={{ readOnly: true }}
                    size="small"
                  />
                </Stack>
              </Stack>
            </Box>
          )}

          <Divider />

          {/* Extend Entitlement */}
          <Box>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Estender Entitlement
            </Typography>
            <Stack spacing={2}>
              <Stack direction="row" spacing={2}>
                <TextField
                  select
                  label="Tipo"
                  value={extendType}
                  onChange={(e) =>
                    setExtendType(e.target.value as "platform" | "support" | "mentorship")
                  }
                  fullWidth
                  size="small"
                  SelectProps={{ native: true }}
                >
                  <option value="platform">Plataforma</option>
                  <option value="support">Suporte</option>
                  <option value="mentorship">Mentoria</option>
                </TextField>
                <TextField
                  type="number"
                  label="Dias"
                  value={extendDays}
                  onChange={(e) => setExtendDays(parseInt(e.target.value) || 0)}
                  fullWidth
                  size="small"
                  inputProps={{ min: 1 }}
                />
              </Stack>
              <Button
                variant="contained"
                startIcon={extending ? <CircularProgress size={16} /> : <ScheduleIcon />}
                onClick={handleExtendEntitlement}
                disabled={extending}
                fullWidth
              >
                Estender Entitlement
              </Button>
            </Stack>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={extending}>
          Fechar
        </Button>
      </DialogActions>
    </Dialog>
  );
}
