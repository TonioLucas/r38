"use client";

import { Grid, Card, CardContent, Typography, Box } from "@mui/material";
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
} from "@mui/icons-material";
import { LeadsMetrics } from "@/types/analytics";

export interface LeadsKPICardsProps {
  metrics: LeadsMetrics;
}

export function LeadsKPICards({ metrics }: LeadsKPICardsProps) {
  return (
    <Grid container spacing={3}>
      {/* Total Leads Card */}
      <Grid item xs={12} sm={6} md={3}>
        <Card sx={{ height: "100%" }}>
          <CardContent>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Total Leads
            </Typography>
            <Typography variant="h4" component="div">
              {metrics.totalLeads.toLocaleString()}
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", mt: 1 }}>
              {metrics.periodComparison.leadsChange >= 0 ? (
                <TrendingUpIcon color="success" sx={{ fontSize: 20, mr: 0.5 }} />
              ) : (
                <TrendingDownIcon color="error" sx={{ fontSize: 20, mr: 0.5 }} />
              )}
              <Typography
                variant="body2"
                color={metrics.periodComparison.leadsChange >= 0 ? "success.main" : "error.main"}
              >
                {Math.abs(metrics.periodComparison.leadsChange).toFixed(1)}%
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ ml: 0.5 }}>
                vs. período anterior
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Conversion Rate Card */}
      <Grid item xs={12} sm={6} md={3}>
        <Card sx={{ height: "100%" }}>
          <CardContent>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Taxa de Conversão
            </Typography>
            <Typography variant="h4" component="div">
              {metrics.conversionRate.toFixed(2)}%
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", mt: 1 }}>
              {metrics.periodComparison.conversionChange >= 0 ? (
                <TrendingUpIcon color="success" sx={{ fontSize: 20, mr: 0.5 }} />
              ) : (
                <TrendingDownIcon color="error" sx={{ fontSize: 20, mr: 0.5 }} />
              )}
              <Typography
                variant="body2"
                color={metrics.periodComparison.conversionChange >= 0 ? "success.main" : "error.main"}
              >
                {Math.abs(metrics.periodComparison.conversionChange).toFixed(1)}%
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ ml: 0.5 }}>
                vs. período anterior
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Top Source Card */}
      <Grid item xs={12} sm={6} md={3}>
        <Card sx={{ height: "100%" }}>
          <CardContent>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Fonte Principal
            </Typography>
            <Typography variant="h4" component="div" sx={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {metrics.topSource.name}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {metrics.topSource.count.toLocaleString()} leads (
              {metrics.topSource.percentage.toFixed(1)}%)
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      {/* Recent Leads 24h Card */}
      <Grid item xs={12} sm={6} md={3}>
        <Card sx={{ height: "100%" }}>
          <CardContent>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Leads Recentes (24h)
            </Typography>
            <Typography variant="h4" component="div">
              {metrics.recentLeads24h.toLocaleString()}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Novos leads nas últimas 24 horas
            </Typography>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}
