"use client";

import { useState, useMemo } from "react";
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
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import { Download as DownloadIcon } from "@mui/icons-material";
import { LeadDoc } from "@/types/firestore";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useSnackbar } from "notistack";

export interface LeadsTableGridProps {
  leads: LeadDoc[];
}

export function LeadsTableGrid({ leads }: LeadsTableGridProps) {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sourceFilter, setSourceFilter] = useState<string>("");
  const [mediumFilter, setMediumFilter] = useState<string>("");
  const [campaignFilter, setCampaignFilter] = useState<string>("");
  const { enqueueSnackbar } = useSnackbar();

  // Get unique values for filter dropdowns
  const uniqueSources = useMemo(() => {
    const sources = new Set(
      leads.map((lead) => lead.utm?.lastTouch?.source || "Direct")
    );
    return Array.from(sources).sort();
  }, [leads]);

  const uniqueMediums = useMemo(() => {
    const mediums = new Set(
      leads
        .map((lead) => lead.utm?.lastTouch?.medium)
        .filter(Boolean)
    );
    return Array.from(mediums).sort();
  }, [leads]);

  const uniqueCampaigns = useMemo(() => {
    const campaigns = new Set(
      leads
        .map((lead) => lead.utm?.lastTouch?.campaign)
        .filter(Boolean)
    );
    return Array.from(campaigns).sort();
  }, [leads]);

  // Client-side filtering
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      if (sourceFilter && (lead.utm?.lastTouch?.source || "Direct") !== sourceFilter) {
        return false;
      }
      if (mediumFilter && lead.utm?.lastTouch?.medium !== mediumFilter) {
        return false;
      }
      if (campaignFilter && lead.utm?.lastTouch?.campaign !== campaignFilter) {
        return false;
      }
      return true;
    });
  }, [leads, sourceFilter, mediumFilter, campaignFilter]);

  // Paginated leads
  const paginatedLeads = useMemo(() => {
    const start = page * rowsPerPage;
    return filteredLeads.slice(start, start + rowsPerPage);
  }, [filteredLeads, page, rowsPerPage]);

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "-";
    try {
      const date = timestamp.toDate();
      // Timestamp is already in Brazilian time (stored in database)
      return date.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
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
        "Term",
        "Content",
        "First Touch Source",
        "AC Contact ID",
        "Score reCAPTCHA",
      ];

      const csvData = filteredLeads.map((lead) => [
        lead.name,
        lead.email,
        lead.phone || "",
        formatDate(lead.createdAt),
        lead.utm?.lastTouch?.source || "",
        lead.utm?.lastTouch?.medium || "",
        lead.utm?.lastTouch?.campaign || "",
        lead.utm?.lastTouch?.term || "",
        lead.utm?.lastTouch?.content || "",
        lead.utm?.firstTouch?.source || "",
        lead.activecampaign?.contactId || "",
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
    <Paper elevation={3} sx={{ p: 3, mt: 3 }}>
      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h6">Dados Detalhados dos Leads</Typography>
        <Button
          variant="contained"
          startIcon={<DownloadIcon />}
          onClick={exportToCSV}
          disabled={filteredLeads.length === 0}
        >
          Exportar CSV
        </Button>
      </Box>

      {/* Filters */}
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 3 }}>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Fonte</InputLabel>
          <Select
            value={sourceFilter}
            label="Fonte"
            onChange={(e) => {
              setSourceFilter(e.target.value);
              setPage(0);
            }}
          >
            <MenuItem value="">Todas as Fontes</MenuItem>
            {uniqueSources.map((source) => (
              <MenuItem key={source} value={source}>
                {source}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Mídia</InputLabel>
          <Select
            value={mediumFilter}
            label="Mídia"
            onChange={(e) => {
              setMediumFilter(e.target.value);
              setPage(0);
            }}
          >
            <MenuItem value="">Todas as Mídias</MenuItem>
            {uniqueMediums.map((medium) => (
              <MenuItem key={medium} value={medium}>
                {medium}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Campanha</InputLabel>
          <Select
            value={campaignFilter}
            label="Campanha"
            onChange={(e) => {
              setCampaignFilter(e.target.value);
              setPage(0);
            }}
          >
            <MenuItem value="">Todas as Campanhas</MenuItem>
            {uniqueCampaigns.map((campaign) => (
              <MenuItem key={campaign} value={campaign}>
                {campaign}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>

      {/* Table */}
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nome</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Data Cadastro</TableCell>
              <TableCell>Source</TableCell>
              <TableCell>Medium</TableCell>
              <TableCell>Campaign</TableCell>
              <TableCell>First Touch Source</TableCell>
              <TableCell>AC Contact ID</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedLeads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  Nenhum lead encontrado
                </TableCell>
              </TableRow>
            ) : (
              paginatedLeads.map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell>{lead.name}</TableCell>
                  <TableCell>{lead.email}</TableCell>
                  <TableCell>{formatDate(lead.createdAt)}</TableCell>
                  <TableCell>{lead.utm?.lastTouch?.source || "-"}</TableCell>
                  <TableCell>{lead.utm?.lastTouch?.medium || "-"}</TableCell>
                  <TableCell>{lead.utm?.lastTouch?.campaign || "-"}</TableCell>
                  <TableCell>{lead.utm?.firstTouch?.source || "-"}</TableCell>
                  <TableCell>{lead.activecampaign?.contactId || "-"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      <TablePagination
        rowsPerPageOptions={[5, 10, 25, 50]}
        component="div"
        count={filteredLeads.length}
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
