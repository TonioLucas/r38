"use client";

import { useState } from "react";
import {
  Box,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Typography,
  TextField,
  Stack,
  CircularProgress,
  Chip,
  IconButton,
  Tooltip,
} from "@mui/material";
import {
  Search as SearchIcon,
  Visibility as ViewIcon,
} from "@mui/icons-material";
import { useAdminCustomers } from "@/hooks/useAdminCustomers";
import { CustomerDetailDialog } from "./CustomerDetailDialog";
import { CustomerDoc } from "@/types/firestore";

export function CustomerTable() {
  const {
    customers,
    loading,
    page,
    setPage,
    rowsPerPage,
    setRowsPerPage,
    totalCount,
    searchEmail,
    setSearchEmail,
    handleSearch,
  } = useAdminCustomers();

  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDoc | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleViewDetails = (customer: CustomerDoc) => {
    setSelectedCustomer(customer);
    setDetailDialogOpen(true);
  };

  const getActiveEntitlements = (customer: CustomerDoc): string[] => {
    const entitlements: string[] = [];
    if (customer.active_entitlements?.platform) entitlements.push("Plataforma");
    if (customer.active_entitlements?.support) entitlements.push("Suporte");
    if (customer.active_entitlements?.mentorship) entitlements.push("Mentoria");
    return entitlements;
  };

  return (
    <>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
          <Typography variant="h6">Clientes</Typography>
          <Typography variant="body2" color="text.secondary">
            Total: {totalCount}
          </Typography>
        </Box>

        <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
          <TextField
            size="small"
            placeholder="Buscar por email"
            value={searchEmail}
            onChange={(e) => setSearchEmail(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSearch()}
            fullWidth
          />
          <Button
            variant="outlined"
            startIcon={<SearchIcon />}
            onClick={handleSearch}
            disabled={loading}
          >
            Buscar
          </Button>
        </Stack>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Email</TableCell>
                <TableCell>Nome</TableCell>
                <TableCell>Firebase UID</TableCell>
                <TableCell>Astron ID</TableCell>
                <TableCell>Entitlements Ativos</TableCell>
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
              ) : customers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    Nenhum cliente encontrado
                  </TableCell>
                </TableRow>
              ) : (
                customers.map((customer) => (
                  <TableRow key={customer.id} hover>
                    <TableCell>{customer.email}</TableCell>
                    <TableCell>{customer.name}</TableCell>
                    <TableCell>
                      <Typography variant="caption" sx={{ fontFamily: "monospace" }}>
                        {customer.id.substring(0, 8)}...
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {customer.astron_member_id ? (
                        <Typography variant="caption" sx={{ fontFamily: "monospace" }}>
                          {customer.astron_member_id.substring(0, 8)}...
                        </Typography>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5} flexWrap="wrap">
                        {getActiveEntitlements(customer).map((entitlement) => (
                          <Chip
                            key={entitlement}
                            label={entitlement}
                            size="small"
                            color="success"
                            variant="outlined"
                          />
                        ))}
                        {getActiveEntitlements(customer).length === 0 && (
                          <Typography variant="caption" color="text.secondary">
                            Nenhum
                          </Typography>
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="Ver Detalhes">
                        <IconButton
                          size="small"
                          onClick={() => handleViewDetails(customer)}
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

        <TablePagination
          rowsPerPageOptions={[10, 25, 50]}
          component="div"
          count={totalCount}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="Linhas por página:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
        />
      </Paper>

      {selectedCustomer && (
        <CustomerDetailDialog
          customer={selectedCustomer}
          open={detailDialogOpen}
          onClose={() => {
            setDetailDialogOpen(false);
            setSelectedCustomer(null);
          }}
        />
      )}
    </>
  );
}
