import { LeadDoc } from "@/types/firestore";
import { LeadsMetrics } from "@/types/analytics";

/**
 * Calculate comprehensive metrics for the leads dashboard
 * @param leads - Array of leads for the current period
 * @param previousPeriodLeads - Array of leads from the previous period for comparison
 * @returns LeadsMetrics object with all calculated metrics
 */
export function calculateMetrics(
  leads: LeadDoc[],
  previousPeriodLeads: LeadDoc[]
): LeadsMetrics {
  const totalLeads = leads.length;

  // Calculate conversions (leads with downloads in last 24h)
  const totalConverted = leads.filter(
    (lead) => lead.download && lead.download.count24h > 0
  ).length;

  const conversionRate = totalLeads > 0 ? (totalConverted / totalLeads) * 100 : 0;

  // Group by source and count occurrences
  const sourceCounts: Record<string, number> = {};
  leads.forEach((lead) => {
    const source = lead.utm?.lastTouch?.source || "Direct";
    sourceCounts[source] = (sourceCounts[source] || 0) + 1;
  });

  // Find top source
  const topSourceEntry = Object.entries(sourceCounts).sort((a, b) => b[1] - a[1])[0];
  const topSource = topSourceEntry
    ? {
        name: topSourceEntry[0],
        count: topSourceEntry[1],
        percentage: (topSourceEntry[1] / totalLeads) * 100,
      }
    : { name: "N/A", count: 0, percentage: 0 };

  // Calculate recent leads (last 24 hours)
  const recentLeads24h = getRecentLeads24h(leads);

  // Calculate period comparison
  const periodComparison = calculatePeriodComparison(
    leads,
    previousPeriodLeads
  );

  return {
    totalLeads,
    totalConverted,
    conversionRate,
    topSource,
    recentLeads24h,
    periodComparison,
  };
}

/**
 * Calculate conversion rate as a percentage
 * @param leads - Array of leads
 * @returns Conversion rate percentage
 */
export function calculateConversionRate(leads: LeadDoc[]): number {
  if (leads.length === 0) return 0;

  const converted = leads.filter(
    (lead) => lead.download && lead.download.count24h > 0
  ).length;

  return (converted / leads.length) * 100;
}

/**
 * Get the top source from leads data
 * @param leads - Array of leads
 * @returns Top source information
 */
export function getTopSource(leads: LeadDoc[]): {
  name: string;
  count: number;
  percentage: number;
} {
  if (leads.length === 0) {
    return { name: "N/A", count: 0, percentage: 0 };
  }

  const sourceCounts: Record<string, number> = {};
  leads.forEach((lead) => {
    const source = lead.utm?.lastTouch?.source || "Direct";
    sourceCounts[source] = (sourceCounts[source] || 0) + 1;
  });

  const topSourceEntry = Object.entries(sourceCounts).sort((a, b) => b[1] - a[1])[0];

  return {
    name: topSourceEntry[0],
    count: topSourceEntry[1],
    percentage: (topSourceEntry[1] / leads.length) * 100,
  };
}

/**
 * Filter leads by date range
 * @param leads - Array of leads
 * @param startDate - Start date of range
 * @param endDate - End date of range
 * @returns Filtered array of leads
 */
export function filterLeadsByDateRange(
  leads: LeadDoc[],
  startDate: Date,
  endDate: Date
): LeadDoc[] {
  return leads.filter((lead) => {
    const leadDate = lead.createdAt.toDate();
    return leadDate >= startDate && leadDate <= endDate;
  });
}

/**
 * Get count of leads created in the last 24 hours
 * @param leads - Array of leads
 * @returns Count of recent leads
 */
export function getRecentLeads24h(leads: LeadDoc[]): number {
  const now = Date.now();
  const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000;

  return leads.filter((lead) => {
    const createdTime = lead.createdAt.toDate().getTime();
    return createdTime >= twentyFourHoursAgo;
  }).length;
}

/**
 * Calculate period-over-period comparison metrics
 * @param currentLeads - Leads from current period
 * @param previousLeads - Leads from previous period
 * @returns Comparison metrics (percentage changes)
 */
export function calculatePeriodComparison(
  currentLeads: LeadDoc[],
  previousLeads: LeadDoc[]
): {
  leadsChange: number;
  conversionChange: number;
} {
  const currentTotal = currentLeads.length;
  const previousTotal = previousLeads.length;

  // Calculate leads change percentage
  const leadsChange = previousTotal > 0
    ? ((currentTotal - previousTotal) / previousTotal) * 100
    : 0;

  // Calculate conversion rate change
  const currentConverted = currentLeads.filter(
    (lead) => lead.download && lead.download.count24h > 0
  ).length;
  const previousConverted = previousLeads.filter(
    (lead) => lead.download && lead.download.count24h > 0
  ).length;

  const currentConversionRate = currentTotal > 0
    ? (currentConverted / currentTotal) * 100
    : 0;
  const previousConversionRate = previousTotal > 0
    ? (previousConverted / previousTotal) * 100
    : 0;

  const conversionChange = currentConversionRate - previousConversionRate;

  return {
    leadsChange,
    conversionChange,
  };
}
