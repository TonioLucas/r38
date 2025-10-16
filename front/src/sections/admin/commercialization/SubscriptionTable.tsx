"use client";

import { useState } from "react";
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  CircularProgress,
  Chip,
  IconButton,
  Tooltip,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import {
  Visibility as ViewIcon,
} from "@mui/icons-material";
import { useAdminSubscriptions } from "@/hooks/useAdminSubscriptions";
import { SubscriptionDetailDialog } from "./SubscriptionDetailDialog";
import { SubscriptionDoc, SubscriptionStatus } from "@/types/firestore";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function SubscriptionTable() {
  const [statusFilter, setStatusFilter] = useState<SubscriptionStatus | "all">("active");
  const { subscriptions, loading, reload } = useAdminSubscriptions(
    statusFilter === "all" ? undefined : statusFilter
  );
  const [selectedSubscription, setSelectedSubscription] = useState<SubscriptionDoc | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  const handleViewDetails = (subscription: SubscriptionDoc) => {
    setSelectedSubscription(subscription);
    setDetailDialogOpen(true);
  };

  const getStatusColor = (
    status: SubscriptionStatus
  ): "default" | "warning" | "success" | "error" | "info" => {
    switch (status) {
      case "active":
        return "success";
      case "payment_pending":
        return "warning";
      case "cancelled":
        return "error";
      case "expired":
        return "default";
      case "refunded":
        return "info";
      default:
        return "default";
    }
  };

  const getStatusLabel = (status: SubscriptionStatus): string => {
    switch (status) {
      case "active":
        return "Ativo";
      case "payment_pending":
        return "Pagamento Pendente";
      case "cancelled":
        return "Cancelado";
      case "expired":
        return "Expirado";
      case "refunded":
        return "Reembolsado";
      default:
        return status;
    }
  };

  const formatDate = (date: Date | null): string => {
    if (!date) return "-";
    try {
      return format(date, "dd/MM/yyyy", { locale: ptBR });
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

  const getEntitlementExpiration = (subscription: SubscriptionDoc, type: "platform" | "support" | "mentorship"): string => {
    const entitlement = subscription.entitlements?.[type];
    if (!entitlement) return "-";
    if (type === "platform" && !entitlement.expires_at) return "Vitalício";
    return formatDate(entitlement.expires_at);
  };

  return (
    <>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
          <Typography variant="h6">Assinaturas</Typography>
          <Stack direction="row" spacing={2} alignItems="center">
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                label="Status"
                onChange={(e) => setStatusFilter(e.target.value as SubscriptionStatus | "all")}
              >
                <MenuItem value="all">Todos</MenuItem>
                <MenuItem value="active">Ativo</MenuItem>
                <MenuItem value="payment_pending">Pag. Pendente</MenuItem>
                <MenuItem value="cancelled">Cancelado</MenuItem>
                <MenuItem value="expired">Expirado</MenuItem>
                <MenuItem value="refunded">Reembolsado</MenuItem>
              </Select>
            </FormControl>
            <Typography variant="body2" color="text.secondary">
              Total: {subscriptions.length}
            </Typography>
          </Stack>
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Email do Cliente</TableCell>
                <TableCell>Produto</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Valor</TableCell>
                <TableCell>Plataforma</TableCell>
                <TableCell>Suporte</TableCell>
                <TableCell>Mentoria</TableCell>
                <TableCell align="center">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : subscriptions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    Nenhuma assinatura encontrada
                  </TableCell>
                </TableRow>
              ) : (
                subscriptions.map((subscription) => (
                  <TableRow key={subscription.id} hover>
                    <TableCell>
                      <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                        {subscription.customer_id}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" sx={{ fontFamily: "monospace" }}>
                        {subscription.product_id}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getStatusLabel(subscription.status)}
                        color={getStatusColor(subscription.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{formatCurrency(subscription.amount_paid)}</TableCell>
                    <TableCell>
                      <Typography variant="caption">
                        {getEntitlementExpiration(subscription, "platform")}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption">
                        {getEntitlementExpiration(subscription, "support")}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {subscription.entitlements?.mentorship?.enabled ? (
                        <Chip label="Sim" size="small" color="success" variant="outlined" />
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          Não
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="Ver Detalhes">
                        <IconButton
                          size="small"
                          onClick={() => handleViewDetails(subscription)}
                          color="primary"
                        >
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {selectedSubscription && (
        <SubscriptionDetailDialog
          subscription={selectedSubscription}
          open={detailDialogOpen}
          onClose={() => {
            setDetailDialogOpen(false);
            setSelectedSubscription(null);
            reload();
          }}
        />
      )}
    </>
  );
}
