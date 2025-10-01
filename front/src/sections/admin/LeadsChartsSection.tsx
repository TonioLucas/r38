"use client";

import { Grid, Card, CardHeader, CardContent, Box } from "@mui/material";
import { LineChart } from "@mui/x-charts/LineChart";
import { PieChart } from "@mui/x-charts/PieChart";
import { BarChart } from "@mui/x-charts/BarChart";
import {
  TimeSeriesDataPoint,
  DistributionDataPoint,
  CampaignPerformance,
} from "@/types/analytics";

export interface LeadsChartsSectionProps {
  timeSeriesData: TimeSeriesDataPoint[];
  sourceDistribution: DistributionDataPoint[];
  campaignPerformance: CampaignPerformance[];
}

export function LeadsChartsSection({
  timeSeriesData,
  sourceDistribution,
  campaignPerformance,
}: LeadsChartsSectionProps) {
  return (
    <Grid container spacing={3} sx={{ mt: 1 }}>
      {/* Line Chart - Traffic Over Time */}
      <Grid item xs={12} md={8}>
        <Card>
          <CardHeader title="Tráfego ao Longo do Tempo" />
          <CardContent>
            {timeSeriesData.length > 0 ? (
              <Box sx={{ width: "100%", height: 300 }}>
                <LineChart
                  dataset={timeSeriesData}
                  xAxis={[{ dataKey: "date", scaleType: "point" }]}
                  series={[
                    {
                      dataKey: "leads",
                      label: "Total de Leads",
                      area: true,
                      color: "#1976d2",
                    },
                    {
                      dataKey: "conversions",
                      label: "Conversões",
                      area: true,
                      color: "#4caf50",
                    },
                  ]}
                />
              </Box>
            ) : (
              <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                Nenhum dado disponível para o período selecionado
              </Box>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* Pie Chart - Source Distribution */}
      <Grid item xs={12} md={4}>
        <Card>
          <CardHeader title="Distribuição por Fonte" />
          <CardContent>
            {sourceDistribution.length > 0 ? (
              <Box sx={{ width: "100%", height: 300 }}>
                <PieChart
                  series={[
                    {
                      data: sourceDistribution,
                      highlightScope: { fade: "global", highlight: "item" },
                      innerRadius: 40,
                      outerRadius: 100,
                    },
                  ]}
                />
              </Box>
            ) : (
              <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                Nenhum dado disponível para o período selecionado
              </Box>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* Bar Chart - Campaign Performance */}
      <Grid item xs={12}>
        <Card>
          <CardHeader title="Performance das Principais Campanhas" />
          <CardContent>
            {campaignPerformance.length > 0 ? (
              <Box sx={{ width: "100%", height: 400 }}>
                <BarChart
                  dataset={campaignPerformance}
                  xAxis={[{ dataKey: "campaign", scaleType: "band" }]}
                  series={[
                    {
                      dataKey: "totalLeads",
                      label: "Total de Leads",
                      color: "#1976d2",
                    },
                    {
                      dataKey: "conversions",
                      label: "Conversões",
                      color: "#4caf50",
                    },
                  ]}
                />
              </Box>
            ) : (
              <Box sx={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                Nenhum dado disponível para o período selecionado
              </Box>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}
