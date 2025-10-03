"use client";

import { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Button,
  ButtonGroup,
  CircularProgress,
} from "@mui/material";
import {
  collection,
  query,
  orderBy,
  limit,
  getDocs,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { LeadDoc } from "@/types/firestore";
import { DateRangeFilter, UTMFilters } from "@/types/analytics";
import { useSnackbar } from "notistack";
import { LeadsKPICards } from "./LeadsKPICards";
import { LeadsChartsSection } from "./LeadsChartsSection";
import { LeadsTableGrid } from "./LeadsTableGrid";
import { useLeadsAnalytics } from "@/hooks/useLeadsAnalytics";

export default function LeadsAnalyticsDashboard() {
  const [allLeads, setAllLeads] = useState<LeadDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [datePreset, setDatePreset] = useState<'7d' | '30d' | '90d'>('30d');
  const [dateRange, setDateRange] = useState<DateRangeFilter>({
    startDate: null,
    endDate: null,
    preset: '30d',
  });
  const [utmFilters] = useState<UTMFilters>({
    source: '',
    medium: '',
    campaign: '',
    term: '',
    content: '',
  });
  const { enqueueSnackbar } = useSnackbar();

  // Fetch all leads on mount
  useEffect(() => {
    loadAllLeads();
  }, []);

  // Update date range when preset changes
  useEffect(() => {
    const end = new Date();
    const start = new Date();

    if (datePreset === '7d') {
      start.setDate(start.getDate() - 7);
    } else if (datePreset === '30d') {
      start.setDate(start.getDate() - 30);
    } else if (datePreset === '90d') {
      start.setDate(start.getDate() - 90);
    }

    setDateRange({ startDate: start, endDate: end, preset: datePreset });
  }, [datePreset]);

  const loadAllLeads = async () => {
    try {
      setLoading(true);
      const leadsRef = collection(db, "leads");
      const q = query(leadsRef, orderBy("createdAt", "desc"), limit(1000));
      const snapshot = await getDocs(q);

      const leadsData: LeadDoc[] = snapshot.docs.map(
        (doc) => ({ ...doc.data(), id: doc.id } as LeadDoc)
      );

      setAllLeads(leadsData);
    } catch (error) {
      console.error("Error loading leads:", error);
      enqueueSnackbar("Erro ao carregar leads", { variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  // Use custom hook for analytics
  const {
    metrics,
    timeSeriesData,
    sourceDistribution,
    campaignPerformance,
    hourlyData,
    dailyData,
    filteredLeads,
  } = useLeadsAnalytics(allLeads, dateRange, utmFilters);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Date Range Selector */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <ButtonGroup variant="outlined">
          <Button
            onClick={() => setDatePreset('7d')}
            variant={datePreset === '7d' ? 'contained' : 'outlined'}
          >
            7 Dias
          </Button>
          <Button
            onClick={() => setDatePreset('30d')}
            variant={datePreset === '30d' ? 'contained' : 'outlined'}
          >
            30 Dias
          </Button>
          <Button
            onClick={() => setDatePreset('90d')}
            variant={datePreset === '90d' ? 'contained' : 'outlined'}
          >
            90 Dias
          </Button>
        </ButtonGroup>
      </Paper>

      {/* KPI Cards */}
      <LeadsKPICards metrics={metrics} />

      {/* Charts Section */}
      <LeadsChartsSection
        timeSeriesData={timeSeriesData}
        sourceDistribution={sourceDistribution}
        campaignPerformance={campaignPerformance}
        hourlyData={hourlyData}
        dailyData={dailyData}
      />

      {/* Enhanced Table */}
      <LeadsTableGrid leads={filteredLeads} />
    </Box>
  );
}
