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
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import { useAdminTransactions } from "@/hooks/useAdminTransactions";
import { PaymentStatus, PaymentProvider } from "@/types/firestore";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function TransactionTable() {
  const [providerFilter, setProviderFilter] = useState<PaymentProvider | "all">("all");
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | "all">("all");

  const { transactions, loading } = useAdminTransactions({
    provider: providerFilter === "all" ? undefined : providerFilter,
    status: statusFilter === "all" ? undefined : statusFilter,
  });

  const getStatusColor = (
    status: PaymentStatus
  ): "default" | "warning" | "success" | "error" | "info" => {
    switch (status) {
      case "confirmed":
        return "success";
      case "pending":
        return "warning";
      case "processing":
        return "info";
      case "failed":
        return "error";
      case "refunded":
        return "default";
      default:
        return "default";
    }
  };

  const getStatusLabel = (status: PaymentStatus): string => {
    switch (status) {
      case "confirmed":
        return "Confirmado";
      case "pending":
        return "Pendente";
      case "processing":
        return "Processando";
      case "failed":
        return "Falhou";
      case "refunded":
        return "Reembolsado";
      default:
        return status;
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

  const formatCurrency = (amount: number, currency: string): string => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: currency || "BRL",
    }).format(amount / 100);
  };

  return (
    <Paper elevation={3} sx={{ p: 3 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h6">Transações de Pagamento</Typography>
        <Stack direction="row" spacing={2} alignItems="center">
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Provedor</InputLabel>
            <Select
              value={providerFilter}
              label="Provedor"
              onChange={(e) => setProviderFilter(e.target.value as PaymentProvider | "all")}
            >
              <MenuItem value="all">Todos</MenuItem>
              <MenuItem value="stripe">Stripe</MenuItem>
              <MenuItem value="btcpayserver">BTCPay</MenuItem>
              <MenuItem value="manual">Manual</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              label="Status"
              onChange={(e) => setStatusFilter(e.target.value as PaymentStatus | "all")}
            >
              <MenuItem value="all">Todos</MenuItem>
              <MenuItem value="confirmed">Confirmado</MenuItem>
              <MenuItem value="pending">Pendente</MenuItem>
              <MenuItem value="processing">Processando</MenuItem>
              <MenuItem value="failed">Falhou</MenuItem>
              <MenuItem value="refunded">Reembolsado</MenuItem>
            </Select>
          </FormControl>
          <Typography variant="body2" color="text.secondary">
            Total: {transactions.length}
          </Typography>
        </Stack>
      </Box>

      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Assinatura</TableCell>
              <TableCell>Valor</TableCell>
              <TableCell>Método</TableCell>
              <TableCell>Provedor</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Data</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : transactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  Nenhuma transação encontrada
                </TableCell>
              </TableRow>
            ) : (
              transactions.map((transaction) => (
                <TableRow key={transaction.id} hover>
                  <TableCell>
                    <Typography variant="caption" sx={{ fontFamily: "monospace" }}>
                      {transaction.id.substring(0, 8)}...
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" sx={{ fontFamily: "monospace" }}>
                      {transaction.subscription_id?.substring(0, 8) || "-"}...
                    </Typography>
                  </TableCell>
                  <TableCell>{formatCurrency(transaction.amount, transaction.currency)}</TableCell>
                  <TableCell>
                    <Chip label={transaction.payment_method} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell>
                    <Chip label={transaction.payment_provider} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={getStatusLabel(transaction.status)}
                      color={getStatusColor(transaction.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption">
                      {formatDate(transaction.createdAt as unknown as Date)}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}
