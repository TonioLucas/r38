"use client";

import { useState, useEffect } from "react";
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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Tooltip,
  IconButton,
} from "@mui/material";
import {
  Download as DownloadIcon,
  Search as SearchIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
} from "@mui/icons-material";
import {
  collection,
  query,
  orderBy,
  limit,
  startAfter,
  getDocs,
  where,
  QueryDocumentSnapshot,
  DocumentData,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { LeadDoc, LeadStatus, LeadProvisioningStatus } from "@/types/firestore";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useSnackbar } from "notistack";

export function LeadsTable() {
  const [leads, setLeads] = useState<LeadDoc[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [searchEmail, setSearchEmail] = useState("");
  const [sourceFilter, setSourceFilter] = useState<'all' | 'ebook_landing' | 'checkout'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | LeadStatus>('all');
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    loadLeads();
  }, [page, rowsPerPage, sourceFilter, statusFilter]);

  const loadLeads = async () => {
    try {
      setLoading(true);

      const leadsRef = collection(db, "leads");

      // Build query with filters
      const queryConstraints: any[] = [];

      // Apply source filter
      if (sourceFilter !== 'all') {
        queryConstraints.push(where("source", "==", sourceFilter));
      }

      // Apply status filter
      if (statusFilter !== 'all') {
        queryConstraints.push(where("status", "==", statusFilter));
      }

      // Apply email search
      if (searchEmail) {
        queryConstraints.push(where("email", "==", searchEmail.toLowerCase()));
      }

      // Always order by createdAt
      queryConstraints.push(orderBy("createdAt", "desc"));
      queryConstraints.push(limit(rowsPerPage));

      // Handle pagination
      if (page > 0 && lastDoc) {
        queryConstraints.push(startAfter(lastDoc));
      }

      const q = query(leadsRef, ...queryConstraints);
      const snapshot = await getDocs(q);

      const leadsData: LeadDoc[] = [];
      let lastVisible: QueryDocumentSnapshot<DocumentData> | null = null;

      snapshot.forEach((doc) => {
        leadsData.push({ ...doc.data(), id: doc.id } as LeadDoc);
        lastVisible = doc;
      });

      setLeads(leadsData);
      setLastDoc(lastVisible);

      if (page === 0) {
        // Count total with same filters
        // Note: Firestore getDocs().size is capped at 1000 for performance
        // For accurate counts beyond 1000, we'd need aggregation queries
        const countConstraints: any[] = [];
        if (sourceFilter !== 'all') {
          countConstraints.push(where("source", "==", sourceFilter));
        }
        if (statusFilter !== 'all') {
          countConstraints.push(where("status", "==", statusFilter));
        }
        if (searchEmail) {
          countConstraints.push(where("email", "==", searchEmail.toLowerCase()));
        }

        const countQuery = query(leadsRef, ...countConstraints);
        const countSnapshot = await getDocs(countQuery);
        // Firestore caps at 1000, so show "1000+" if we hit the limit
        const count = countSnapshot.size;
        setTotalCount(count === 1000 ? 1001 : count); // 1001 will show "1000+" in pagination
      }
    } catch (error) {
      console.error("Error loading leads:", error);
      enqueueSnackbar("Erro ao carregar leads", { variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSearch = () => {
    setPage(0);
    loadLeads();
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "-";
    try {
      const date = timestamp.toDate();
      return format(date, "dd/MM/yyyy HH:mm", { locale: ptBR });
    } catch {
      return "-";
    }
  };

  const getSourceLabel = (source: string) => {
    return source === 'ebook_landing' ? 'E-book' : 'Checkout';
  };

  const getSourceColor = (source: string) => {
    return source === 'ebook_landing' ? 'primary' : 'secondary';
  };

  const getStatusLabel = (status: LeadStatus) => {
    const labels: Record<LeadStatus, string> = {
      initiated: 'Iniciado',
      abandoned: 'Abandonado',
      converted: 'Convertido',
    };
    return labels[status];
  };

  const getStatusColor = (status: LeadStatus) => {
    const colors: Record<LeadStatus, 'default' | 'warning' | 'success'> = {
      initiated: 'default',
      abandoned: 'warning',
      converted: 'success',
    };
    return colors[status];
  };

  const getProvisioningStatusLabel = (status: LeadProvisioningStatus) => {
    const labels: Record<LeadProvisioningStatus, string> = {
      pending_admin_approval: 'Aguardando Aprovação',
      completed: 'Completo',
      failed: 'Falhou',
    };
    return labels[status];
  };

  const renderProvisioningStatus = (lead: LeadDoc) => {
    if (lead.status !== 'converted' || !lead.provisioning_status) {
      return '-';
    }

    if (lead.provisioning_status === 'completed') {
      return <CheckCircleIcon color="success" fontSize="small" />;
    }

    if (lead.provisioning_status === 'failed') {
      return (
        <Tooltip title={lead.provisioning_error || 'Erro desconhecido'}>
          <ErrorIcon color="error" fontSize="small" />
        </Tooltip>
      );
    }

    if (lead.provisioning_status === 'pending_admin_approval') {
      return (
        <Chip
          label={getProvisioningStatusLabel(lead.provisioning_status)}
          color="warning"
          size="small"
        />
      );
    }

    return '-';
  };

  const exportToCSV = () => {
    try {
      const headers = [
        "Nome",
        "Email",
        "Telefone",
        "Data Cadastro",
        "Tipo",
        "Status",
        "Status Provisionamento",
        "Produto",
        "Preço",
        "Source",
        "Medium",
        "Campaign",
        "Downloads 24h",
        "Score reCAPTCHA",
      ];

      const csvData = leads.map((lead) => [
        lead.name,
        lead.email,
        lead.phone || "",
        formatDate(lead.createdAt),
        getSourceLabel(lead.source),
        getStatusLabel(lead.status),
        lead.provisioning_status ? getProvisioningStatusLabel(lead.provisioning_status) : "",
        lead.product_id || "",
        lead.price_id || "",
        lead.utm?.lastTouch?.source || "",
        lead.utm?.lastTouch?.medium || "",
        lead.utm?.lastTouch?.campaign || "",
        lead.download?.count24h || 0,
        lead.recaptchaScore || 0,
      ]);

      const csvContent = [
        headers.join(","),
        ...csvData.map((row) => row.map((cell) => `"${cell}"`).join(",")),
      ].join("\n");

      const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);

      link.setAttribute("href", url);
      link.setAttribute("download", `leads_${format(new Date(), "yyyy-MM-dd_HH-mm")}.csv`);
      link.style.visibility = "hidden";

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      enqueueSnackbar("CSV exportado com sucesso", { variant: "success" });
    } catch (error) {
      console.error("Error exporting CSV:", error);
      enqueueSnackbar("Erro ao exportar CSV", { variant: "error" });
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 3 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h6">
          Leads Cadastrados
        </Typography>
        <Button
          variant="contained"
          startIcon={<DownloadIcon />}
          onClick={exportToCSV}
          disabled={loading || leads.length === 0}
        >
          Exportar CSV
        </Button>
      </Box>

      <Stack direction="row" spacing={2} sx={{ mb: 3 }} flexWrap="wrap">
        <TextField
          size="small"
          placeholder="Buscar por email"
          value={searchEmail}
          onChange={(e) => setSearchEmail(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && handleSearch()}
          sx={{ minWidth: 200 }}
        />
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Tipo</InputLabel>
          <Select
            value={sourceFilter}
            label="Tipo"
            onChange={(e) => {
              setSourceFilter(e.target.value as any);
              setPage(0);
            }}
          >
            <MenuItem value="all">Todos</MenuItem>
            <MenuItem value="ebook_landing">E-book</MenuItem>
            <MenuItem value="checkout">Checkout</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={statusFilter}
            label="Status"
            onChange={(e) => {
              setStatusFilter(e.target.value as any);
              setPage(0);
            }}
          >
            <MenuItem value="all">Todos</MenuItem>
            <MenuItem value="initiated">Iniciado</MenuItem>
            <MenuItem value="abandoned">Abandonado</MenuItem>
            <MenuItem value="converted">Convertido</MenuItem>
          </Select>
        </FormControl>
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
              <TableCell>Nome</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Telefone</TableCell>
              <TableCell>Data Cadastro</TableCell>
              <TableCell>Tipo</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="center">Provisionamento</TableCell>
              <TableCell>Produto/Preço</TableCell>
              <TableCell>Source</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : leads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  Nenhum lead encontrado
                </TableCell>
              </TableRow>
            ) : (
              leads.map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell>{lead.name}</TableCell>
                  <TableCell>{lead.email}</TableCell>
                  <TableCell>{lead.phone || "-"}</TableCell>
                  <TableCell>{formatDate(lead.createdAt)}</TableCell>
                  <TableCell>
                    <Chip
                      label={getSourceLabel(lead.source)}
                      color={getSourceColor(lead.source) as any}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={getStatusLabel(lead.status)}
                      color={getStatusColor(lead.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="center">{renderProvisioningStatus(lead)}</TableCell>
                  <TableCell>
                    {lead.source === 'checkout' && (lead.product_id || lead.price_id) ? (
                      <Typography variant="caption" sx={{ fontSize: '0.75rem' }}>
                        {lead.product_id && `Produto: ${lead.product_id.substring(0, 12)}...`}
                        {lead.product_id && lead.price_id && <br />}
                        {lead.price_id && `Preço: ${lead.price_id.substring(0, 12)}...`}
                      </Typography>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>{lead.utm?.lastTouch?.source || "-"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        rowsPerPageOptions={[5, 10, 25]}
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
  );
}