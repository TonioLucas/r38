"use client";

import { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  IconButton,
  Collapse,
  Chip,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  CircularProgress,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import {
  KeyboardArrowDown,
  KeyboardArrowUp,
  Refresh,
  CheckCircle,
} from "@mui/icons-material";
import {
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  where,
  Timestamp,
} from "firebase/firestore";
import { db, functions } from "@/lib/firebase";
import { httpsCallable } from "firebase/functions";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useSnackbar } from "notistack";

interface WebhookEvent {
  id: string;
  provider: string;
  event_type: string;
  processed: boolean;
  createdAt: Timestamp;
  payload: any;
}

interface ErrorLog {
  id: string;
  source: string;
  error_type: string;
  error_message: string;
  stack_trace?: string;
  context: any;
  resolved: boolean;
  resolved_by?: string;
  resolved_at?: Timestamp;
  notes?: string;
  createdAt: Timestamp;
}

function WebhookEventRow({ event }: { event: WebhookEvent }) {
  const [open, setOpen] = useState(false);

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "-";
    try {
      const date = timestamp.toDate();
      return format(date, "dd/MM/yyyy HH:mm:ss", { locale: ptBR });
    } catch {
      return "-";
    }
  };

  return (
    <>
      <TableRow>
        <TableCell>
          <IconButton size="small" onClick={() => setOpen(!open)}>
            {open ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
          </IconButton>
        </TableCell>
        <TableCell>{formatDate(event.createdAt)}</TableCell>
        <TableCell>
          <Chip
            label={event.provider}
            size="small"
            color={
              event.provider === "stripe"
                ? "primary"
                : event.provider === "btcpay"
                ? "secondary"
                : "default"
            }
          />
        </TableCell>
        <TableCell>{event.event_type}</TableCell>
        <TableCell>
          <Chip
            label={event.processed ? "Processado" : "Pendente"}
            size="small"
            color={event.processed ? "success" : "warning"}
          />
        </TableCell>
        <TableCell>
          <Typography variant="caption" color="text.secondary">
            {event.id}
          </Typography>
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ margin: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Payload:
              </Typography>
              <pre
                style={{
                  backgroundColor: "#f5f5f5",
                  padding: "16px",
                  borderRadius: "4px",
                  overflow: "auto",
                  fontSize: "12px",
                  fontFamily: "monospace",
                }}
              >
                {JSON.stringify(event.payload, null, 2)}
              </pre>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}

export default function MonitorPage() {
  const [tabValue, setTabValue] = useState(0);
  const [webhookEvents, setWebhookEvents] = useState<WebhookEvent[]>([]);
  const [errorLogs, setErrorLogs] = useState<ErrorLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [providerFilter, setProviderFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [selectedErrorId, setSelectedErrorId] = useState<string | null>(null);
  const [resolveNotes, setResolveNotes] = useState("");
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    loadData();
  }, [tabValue, providerFilter, statusFilter]);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(loadData, 30000); // 30 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh, tabValue, providerFilter, statusFilter]);

  const loadData = async () => {
    if (tabValue === 0) {
      await loadWebhookEvents();
    } else {
      await loadErrorLogs();
    }
  };

  const loadWebhookEvents = async () => {
    try {
      setLoading(true);
      const eventsRef = collection(db, "webhook_events");
      const constraints: any[] = [orderBy("createdAt", "desc"), limit(100)];

      if (providerFilter !== "all") {
        constraints.unshift(where("provider", "==", providerFilter));
      }

      if (statusFilter !== "all") {
        constraints.unshift(
          where("processed", "==", statusFilter === "processed")
        );
      }

      const q = query(eventsRef, ...constraints);
      const snapshot = await getDocs(q);

      const events: WebhookEvent[] = [];
      snapshot.forEach((doc) => {
        events.push({ ...doc.data(), id: doc.id } as WebhookEvent);
      });

      setWebhookEvents(events);
    } catch (error) {
      console.error("Error loading webhook events:", error);
      enqueueSnackbar("Erro ao carregar eventos", { variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  const loadErrorLogs = async () => {
    try {
      setLoading(true);
      const logsRef = collection(db, "error_logs");
      const constraints: any[] = [orderBy("createdAt", "desc"), limit(100)];

      if (statusFilter !== "all") {
        constraints.unshift(where("resolved", "==", statusFilter === "resolved"));
      }

      const q = query(logsRef, ...constraints);
      const snapshot = await getDocs(q);

      const logs: ErrorLog[] = [];
      snapshot.forEach((doc) => {
        logs.push({ ...doc.data(), id: doc.id } as ErrorLog);
      });

      setErrorLogs(logs);
    } catch (error) {
      console.error("Error loading error logs:", error);
      enqueueSnackbar("Erro ao carregar logs de erro", { variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleMarkResolved = async () => {
    if (!selectedErrorId) return;

    try {
      const markErrorResolved = httpsCallable(functions, "mark_error_resolved");
      await markErrorResolved({
        error_log_id: selectedErrorId,
        notes: resolveNotes,
      });

      enqueueSnackbar("Erro marcado como resolvido", { variant: "success" });
      setResolveDialogOpen(false);
      setResolveNotes("");
      setSelectedErrorId(null);
      loadErrorLogs();
    } catch (error: any) {
      console.error("Error marking as resolved:", error);
      enqueueSnackbar(error.message || "Erro ao marcar como resolvido", {
        variant: "error",
      });
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "-";
    try {
      const date = timestamp.toDate();
      return format(date, "dd/MM/yyyy HH:mm:ss", { locale: ptBR });
    } catch {
      return "-";
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}>
        <Typography variant="h4">Monitoramento</Typography>
        <Stack direction="row" spacing={2}>
          <Button
            variant={autoRefresh ? "contained" : "outlined"}
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            Auto-refresh {autoRefresh ? "ON" : "OFF"}
          </Button>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={loadData}
            disabled={loading}
          >
            Atualizar
          </Button>
        </Stack>
      </Box>

      <Paper sx={{ width: "100%" }}>
        <Tabs
          value={tabValue}
          onChange={(e, newValue) => setTabValue(newValue)}
          sx={{ borderBottom: 1, borderColor: "divider" }}
        >
          <Tab label="Webhook Events" />
          <Tab label="Error Logs" />
        </Tabs>

        {/* Filters */}
        <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
          <Stack direction="row" spacing={2}>
            {tabValue === 0 && (
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Provider</InputLabel>
                <Select
                  value={providerFilter}
                  label="Provider"
                  onChange={(e) => setProviderFilter(e.target.value)}
                >
                  <MenuItem value="all">Todos</MenuItem>
                  <MenuItem value="stripe">Stripe</MenuItem>
                  <MenuItem value="btcpay">BTCPay</MenuItem>
                  <MenuItem value="dub">Dub</MenuItem>
                </Select>
              </FormControl>
            )}
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                label="Status"
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="all">Todos</MenuItem>
                {tabValue === 0 ? (
                  <>
                    <MenuItem value="processed">Processado</MenuItem>
                    <MenuItem value="unprocessed">Não Processado</MenuItem>
                  </>
                ) : (
                  <>
                    <MenuItem value="unresolved">Não Resolvido</MenuItem>
                    <MenuItem value="resolved">Resolvido</MenuItem>
                  </>
                )}
              </Select>
            </FormControl>
          </Stack>
        </Box>

        {/* Webhook Events Tab */}
        {tabValue === 0 && (
          <TableContainer>
            {loading ? (
              <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell width={50} />
                    <TableCell>Timestamp</TableCell>
                    <TableCell>Provider</TableCell>
                    <TableCell>Event Type</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>ID</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {webhookEvents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        Nenhum evento encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    webhookEvents.map((event) => (
                      <WebhookEventRow key={event.id} event={event} />
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </TableContainer>
        )}

        {/* Error Logs Tab */}
        {tabValue === 1 && (
          <TableContainer>
            {loading ? (
              <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell width={50} />
                    <TableCell>Timestamp</TableCell>
                    <TableCell>Source</TableCell>
                    <TableCell>Error Type</TableCell>
                    <TableCell>Message</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {errorLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        Nenhum erro encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    errorLogs.map((log) => {
                      const [open, setOpen] = useState(false);
                      return (
                        <>
                          <TableRow key={log.id}>
                            <TableCell>
                              <IconButton
                                size="small"
                                onClick={() => setOpen(!open)}
                              >
                                {open ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
                              </IconButton>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {formatDate(log.createdAt)}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip label={log.source} size="small" />
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {log.error_type}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography
                                variant="body2"
                                sx={{
                                  maxWidth: 300,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {log.error_message}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              {log.resolved ? (
                                <Chip
                                  label="Resolvido"
                                  size="small"
                                  color="success"
                                  icon={<CheckCircle />}
                                />
                              ) : (
                                <Chip label="Pendente" size="small" color="error" />
                              )}
                            </TableCell>
                            <TableCell>
                              {!log.resolved && (
                                <Button
                                  size="small"
                                  onClick={() => {
                                    setSelectedErrorId(log.id);
                                    setResolveDialogOpen(true);
                                  }}
                                >
                                  Resolver
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell
                              style={{ paddingBottom: 0, paddingTop: 0 }}
                              colSpan={7}
                            >
                              <Collapse in={open} timeout="auto" unmountOnExit>
                                <Box sx={{ margin: 2 }}>
                                  <Typography variant="subtitle2" gutterBottom>
                                    Stack Trace:
                                  </Typography>
                                  <pre
                                    style={{
                                      backgroundColor: "#f5f5f5",
                                      padding: "16px",
                                      borderRadius: "4px",
                                      overflow: "auto",
                                      fontSize: "11px",
                                      fontFamily: "monospace",
                                      marginBottom: "16px",
                                    }}
                                  >
                                    {log.stack_trace || "No stack trace available"}
                                  </pre>
                                  <Typography variant="subtitle2" gutterBottom>
                                    Context:
                                  </Typography>
                                  <pre
                                    style={{
                                      backgroundColor: "#f5f5f5",
                                      padding: "16px",
                                      borderRadius: "4px",
                                      overflow: "auto",
                                      fontSize: "12px",
                                      fontFamily: "monospace",
                                    }}
                                  >
                                    {JSON.stringify(log.context, null, 2)}
                                  </pre>
                                  {log.resolved && (
                                    <Box sx={{ mt: 2 }}>
                                      <Typography variant="subtitle2" gutterBottom>
                                        Resolução:
                                      </Typography>
                                      <Typography variant="body2">
                                        Resolvido por: {log.resolved_by}
                                      </Typography>
                                      <Typography variant="body2">
                                        Em: {formatDate(log.resolved_at)}
                                      </Typography>
                                      {log.notes && (
                                        <Typography variant="body2">
                                          Notas: {log.notes}
                                        </Typography>
                                      )}
                                    </Box>
                                  )}
                                </Box>
                              </Collapse>
                            </TableCell>
                          </TableRow>
                        </>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            )}
          </TableContainer>
        )}
      </Paper>

      {/* Resolve Dialog */}
      <Dialog
        open={resolveDialogOpen}
        onClose={() => setResolveDialogOpen(false)}
      >
        <DialogTitle>Marcar Erro como Resolvido</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Notas de Resolução (opcional)"
            value={resolveNotes}
            onChange={(e) => setResolveNotes(e.target.value)}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResolveDialogOpen(false)}>Cancelar</Button>
          <Button onClick={handleMarkResolved} variant="contained">
            Marcar como Resolvido
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
