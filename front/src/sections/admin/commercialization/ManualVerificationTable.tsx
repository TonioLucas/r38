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
import { Visibility as ViewIcon } from "@mui/icons-material";
import { useAdminVerifications } from "@/hooks/useAdminVerifications";
import { VerificationReviewDialog } from "./VerificationReviewDialog";
import { ManualVerificationDoc, ManualVerificationStatus } from "@/types/firestore";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function ManualVerificationTable() {
  const [statusFilter, setStatusFilter] = useState<ManualVerificationStatus | "all">("pending");
  const { verifications, loading, reload } = useAdminVerifications(
    statusFilter === "all" ? undefined : statusFilter
  );
  const [selectedVerification, setSelectedVerification] = useState<ManualVerificationDoc | null>(
    null
  );
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);

  const handleViewVerification = (verification: ManualVerificationDoc) => {
    setSelectedVerification(verification);
    setReviewDialogOpen(true);
  };

  const getStatusColor = (
    status: ManualVerificationStatus
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

  const getStatusLabel = (status: ManualVerificationStatus): string => {
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

  const formatDate = (date: Date | null): string => {
    if (!date) return "-";
    try {
      return format(date, "dd/MM/yyyy HH:mm", { locale: ptBR });
    } catch {
      return "-";
    }
  };

  return (
    <>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
          <Typography variant="h6">Verificações Manuais</Typography>
          <Stack direction="row" spacing={2} alignItems="center">
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                label="Status"
                onChange={(e) => setStatusFilter(e.target.value as ManualVerificationStatus | "all")}
              >
                <MenuItem value="all">Todos</MenuItem>
                <MenuItem value="pending">Pendente</MenuItem>
                <MenuItem value="approved">Aprovado</MenuItem>
                <MenuItem value="rejected">Rejeitado</MenuItem>
              </Select>
            </FormControl>
            <Typography variant="body2" color="text.secondary">
              Total: {verifications.length}
            </Typography>
          </Stack>
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Email</TableCell>
                <TableCell>Data Submissão</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Revisado Por</TableCell>
                <TableCell>Data Revisão</TableCell>
                <TableCell align="center">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : verifications.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    Nenhuma verificação encontrada
                  </TableCell>
                </TableRow>
              ) : (
                verifications.map((verification) => (
                  <TableRow key={verification.id} hover>
                    <TableCell>{verification.email}</TableCell>
                    <TableCell>{formatDate(verification.submitted_at)}</TableCell>
                    <TableCell>
                      <Chip
                        label={getStatusLabel(verification.status)}
                        color={getStatusColor(verification.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {verification.reviewed_by ? (
                        <Typography variant="caption">{verification.reviewed_by}</Typography>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>{formatDate(verification.reviewed_at)}</TableCell>
                    <TableCell align="center">
                      <Tooltip title="Revisar">
                        <IconButton
                          size="small"
                          onClick={() => handleViewVerification(verification)}
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

      {selectedVerification && (
        <VerificationReviewDialog
          verification={selectedVerification}
          open={reviewDialogOpen}
          onClose={() => {
            setReviewDialogOpen(false);
            setSelectedVerification(null);
            reload(); // Reload the list after closing
          }}
        />
      )}
    </>
  );
}
