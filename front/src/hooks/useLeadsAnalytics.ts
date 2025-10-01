import { useMemo } from "react";
import { LeadDoc } from "@/types/firestore";
import {
  DateRangeFilter,
  UTMFilters,
  LeadsMetrics,
  TimeSeriesDataPoint,
  DistributionDataPoint,
  CampaignPerformance,
} from "@/types/analytics";
import { calculateMetrics } from "@/utils/leadsMetrics";
import {
  transformToTimeSeriesData,
  transformToDistributionData,
  transformToCampaignPerformanceData,
} from "@/utils/leadsChartData";

/**
 * Custom hook for leads analytics processing
 * Performs client-side filtering and aggregation of leads data
 * @param allLeads - Complete array of leads from Firestore
 * @param dateRange - Date range filter
 * @param utmFilters - UTM parameter filters
 * @returns Analytics data including metrics, chart data, and filtered leads
 */
export function useLeadsAnalytics(
  allLeads: LeadDoc[],
  dateRange: DateRangeFilter,
  utmFilters: UTMFilters
) {
  // Filter by date range
  const filteredByDate = useMemo(() => {
    if (!dateRange.startDate || !dateRange.endDate) return allLeads;

    return allLeads.filter((lead) => {
      const leadDate = lead.createdAt.toDate();
      return leadDate >= dateRange.startDate! && leadDate <= dateRange.endDate!;
    });
  }, [allLeads, dateRange]);

  // Filter by UTM parameters
  const filteredLeads = useMemo(() => {
    return filteredByDate.filter((lead) => {
      if (utmFilters.source && lead.utm?.lastTouch?.source !== utmFilters.source) {
        return false;
      }
      if (utmFilters.medium && lead.utm?.lastTouch?.medium !== utmFilters.medium) {
        return false;
      }
      if (utmFilters.campaign && lead.utm?.lastTouch?.campaign !== utmFilters.campaign) {
        return false;
      }
      if (utmFilters.term && lead.utm?.lastTouch?.term !== utmFilters.term) {
        return false;
      }
      if (utmFilters.content && lead.utm?.lastTouch?.content !== utmFilters.content) {
        return false;
      }
      return true;
    });
  }, [filteredByDate, utmFilters]);

  // Calculate metrics with period comparison
  const metrics = useMemo(() => {
    // Get previous period leads for comparison
    const periodLength = dateRange.endDate && dateRange.startDate
      ? dateRange.endDate.getTime() - dateRange.startDate.getTime()
      : 30 * 24 * 60 * 60 * 1000; // Default 30 days

    const previousStartDate = new Date(
      (dateRange.startDate?.getTime() || Date.now()) - periodLength
    );
    const previousEndDate = dateRange.startDate || new Date();

    const previousPeriodLeads = allLeads.filter((lead) => {
      const leadDate = lead.createdAt.toDate();
      return leadDate >= previousStartDate && leadDate <= previousEndDate;
    });

    return calculateMetrics(filteredLeads, previousPeriodLeads);
  }, [filteredLeads, allLeads, dateRange]);

  // Transform data for time-series chart
  const timeSeriesData = useMemo(
    () => transformToTimeSeriesData(filteredLeads, 'day'),
    [filteredLeads]
  );

  // Transform data for source distribution pie chart
  const sourceDistribution = useMemo(
    () => transformToDistributionData(filteredLeads, 5),
    [filteredLeads]
  );

  // Transform data for campaign performance bar chart
  const campaignPerformance = useMemo(
    () => transformToCampaignPerformanceData(filteredLeads, 10),
    [filteredLeads]
  );

  return {
    metrics,
    timeSeriesData,
    sourceDistribution,
    campaignPerformance,
    filteredLeads,
  };
}
