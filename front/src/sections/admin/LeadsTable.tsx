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
} from "@mui/material";
import { Download as DownloadIcon, Search as SearchIcon } from "@mui/icons-material";
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
import { LeadDoc } from "@/types/firestore";
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
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    loadLeads();
  }, [page, rowsPerPage]);

  const loadLeads = async () => {
    try {
      setLoading(true);

      const leadsRef = collection(db, "leads");
      let q = query(
        leadsRef,
        orderBy("createdAt", "desc"),
        limit(rowsPerPage)
      );

      if (page > 0 && lastDoc) {
        q = query(
          leadsRef,
          orderBy("createdAt", "desc"),
          startAfter(lastDoc),
          limit(rowsPerPage)
        );
      }

      if (searchEmail) {
        q = query(
          leadsRef,
          where("email", "==", searchEmail.toLowerCase()),
          orderBy("createdAt", "desc"),
          limit(rowsPerPage)
        );
      }

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
        const countQuery = query(leadsRef);
        const countSnapshot = await getDocs(countQuery);
        setTotalCount(countSnapshot.size);
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

  const exportToCSV = () => {
    try {
      const headers = [
        "Nome",
        "Email",
        "Telefone",
        "Data Cadastro",
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

      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        <TextField
          size="small"
          placeholder="Buscar por email"
          value={searchEmail}
          onChange={(e) => setSearchEmail(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && handleSearch()}
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
              <TableCell>Nome</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Telefone</TableCell>
              <TableCell>Data Cadastro</TableCell>
              <TableCell>Source</TableCell>
              <TableCell align="center">Downloads 24h</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : leads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
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
                  <TableCell>{lead.utm?.lastTouch?.source || "-"}</TableCell>
                  <TableCell align="center">{lead.download?.count24h || 0}</TableCell>
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