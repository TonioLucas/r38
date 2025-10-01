import { format, parseISO, startOfDay } from "date-fns";
import { LeadDoc } from "@/types/firestore";
import {
  TimeSeriesDataPoint,
  DistributionDataPoint,
  CampaignPerformance,
} from "@/types/analytics";

/**
 * Transform leads data into time-series data points for line charts
 * @param leads - Array of leads to transform
 * @param groupBy - Grouping period ('day' or 'week')
 * @returns Array of time-series data points
 */
export function transformToTimeSeriesData(
  leads: LeadDoc[],
  groupBy: 'day' | 'week' = 'day'
): TimeSeriesDataPoint[] {
  // Group leads by date
  const groupedData: Record<string, { leads: number; conversions: number }> = {};

  leads.forEach((lead) => {
    const date = startOfDay(lead.createdAt.toDate());
    const dateKey = format(date, "yyyy-MM-dd");

    if (!groupedData[dateKey]) {
      groupedData[dateKey] = { leads: 0, conversions: 0 };
    }

    groupedData[dateKey].leads += 1;
    if (lead.download && lead.download.count24h > 0) {
      groupedData[dateKey].conversions += 1;
    }
  });

  // Convert to array and sort by date
  const dataPoints: TimeSeriesDataPoint[] = Object.entries(groupedData)
    .map(([date, data]) => ({
      date: format(parseISO(date), "MMM dd"), // "Jan 15"
      leads: data.leads,
      conversions: data.conversions,
      conversionRate: data.leads > 0 ? (data.conversions / data.leads) * 100 : 0,
    }))
    .sort((a, b) => {
      // Parse the "MMM dd" format back to dates for sorting
      const dateA = new Date(2024, 0, 1); // placeholder year
      const dateB = new Date(2024, 0, 1);
      return dateA.getTime() - dateB.getTime();
    });

  return dataPoints;
}

/**
 * Transform leads data into distribution data for pie charts
 * Limits to top N sources plus an "Others" category
 * @param leads - Array of leads to transform
 * @param topN - Number of top sources to show (default: 5)
 * @returns Array of distribution data points
 */
export function transformToDistributionData(
  leads: LeadDoc[],
  topN: number = 5
): DistributionDataPoint[] {
  const sourceCounts: Record<string, number> = {};

  // Count occurrences of each source
  leads.forEach((lead) => {
    const source = lead.utm?.lastTouch?.source || "Direct";
    sourceCounts[source] = (sourceCounts[source] || 0) + 1;
  });

  // Sort by count descending
  const sorted = Object.entries(sourceCounts).sort((a, b) => b[1] - a[1]);

  // Take top N sources
  const topSources = sorted.slice(0, topN);
  const otherSources = sorted.slice(topN);
  const othersCount = otherSources.reduce((sum, [_, count]) => sum + count, 0);

  const totalCount = leads.length;
  const distribution: DistributionDataPoint[] = topSources.map(([source, count], index) => ({
    id: index.toString(),
    label: source,
    value: count,
    percentage: totalCount > 0 ? (count / totalCount) * 100 : 0,
  }));

  // Add "Others" category if there are more sources
  if (othersCount > 0) {
    distribution.push({
      id: topN.toString(),
      label: "Others",
      value: othersCount,
      percentage: totalCount > 0 ? (othersCount / totalCount) * 100 : 0,
    });
  }

  return distribution;
}

/**
 * Transform leads data into campaign performance data for bar charts
 * @param leads - Array of leads to transform
 * @param topN - Number of top campaigns to include (default: 10)
 * @returns Array of campaign performance data
 */
export function transformToCampaignPerformanceData(
  leads: LeadDoc[],
  topN: number = 10
): CampaignPerformance[] {
  // Group by campaign
  const campaignData: Record<string, {
    source: string;
    medium: string;
    totalLeads: number;
    conversions: number;
  }> = {};

  leads.forEach((lead) => {
    const campaign = lead.utm?.lastTouch?.campaign || "No Campaign";
    const source = lead.utm?.lastTouch?.source || "Direct";
    const medium = lead.utm?.lastTouch?.medium || "None";
    const isConverted = lead.download && lead.download.count24h > 0;

    if (!campaignData[campaign]) {
      campaignData[campaign] = {
        source,
        medium,
        totalLeads: 0,
        conversions: 0,
      };
    }

    campaignData[campaign].totalLeads += 1;
    if (isConverted) {
      campaignData[campaign].conversions += 1;
    }
  });

  // Convert to array and calculate conversion rates
  const performanceData: CampaignPerformance[] = Object.entries(campaignData).map(
    ([campaign, data]) => ({
      campaign,
      source: data.source,
      medium: data.medium,
      totalLeads: data.totalLeads,
      conversions: data.conversions,
      conversionRate: data.totalLeads > 0
        ? (data.conversions / data.totalLeads) * 100
        : 0,
    })
  );

  // Sort by total leads descending and limit to top N
  return performanceData
    .sort((a, b) => b.totalLeads - a.totalLeads)
    .slice(0, topN);
}

/**
 * Aggregate leads by a specific time period
 * @param leads - Array of leads to aggregate
 * @param period - Period to aggregate by ('day', 'week', 'month')
 * @returns Aggregated data by period
 */
export function aggregateByPeriod(
  leads: LeadDoc[],
  period: 'day' | 'week' | 'month'
): Record<string, LeadDoc[]> {
  const aggregated: Record<string, LeadDoc[]> = {};

  leads.forEach((lead) => {
    const date = lead.createdAt.toDate();
    let key: string;

    switch (period) {
      case 'day':
        key = format(date, "yyyy-MM-dd");
        break;
      case 'week':
        key = format(date, "yyyy-'W'ww");
        break;
      case 'month':
        key = format(date, "yyyy-MM");
        break;
      default:
        key = format(date, "yyyy-MM-dd");
    }

    if (!aggregated[key]) {
      aggregated[key] = [];
    }

    aggregated[key].push(lead);
  });

  return aggregated;
}
