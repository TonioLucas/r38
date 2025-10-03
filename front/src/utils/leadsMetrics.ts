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

  // Calculate growth rates
  const now = Date.now();
  const oneDayAgo = now - 24 * 60 * 60 * 1000;
  const twoDaysAgo = now - 2 * 24 * 60 * 60 * 1000;
  const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
  const twoWeeksAgo = now - 14 * 24 * 60 * 60 * 1000;

  const leadsYesterday = leads.filter((lead) => {
    const createdTime = lead.createdAt.toDate().getTime();
    return createdTime >= twoDaysAgo && createdTime < oneDayAgo;
  }).length;

  const leadsToday = leads.filter((lead) => {
    const createdTime = lead.createdAt.toDate().getTime();
    return createdTime >= oneDayAgo;
  }).length;

  const leadsLastWeek = leads.filter((lead) => {
    const createdTime = lead.createdAt.toDate().getTime();
    return createdTime >= twoWeeksAgo && createdTime < oneWeekAgo;
  }).length;

  const leadsThisWeek = leads.filter((lead) => {
    const createdTime = lead.createdAt.toDate().getTime();
    return createdTime >= oneWeekAgo;
  }).length;

  const dailyGrowthRate = leadsYesterday > 0
    ? ((leadsToday - leadsYesterday) / leadsYesterday) * 100
    : 0;

  const weeklyGrowthRate = leadsLastWeek > 0
    ? ((leadsThisWeek - leadsLastWeek) / leadsLastWeek) * 100
    : 0;

  // Calculate ActiveCampaign sync metrics
  const syncedToActiveCampaign = leads.filter(
    (lead) => lead.activecampaign?.contactId
  ).length;

  const syncRate = totalLeads > 0
    ? (syncedToActiveCampaign / totalLeads) * 100
    : 0;

  // Calculate period comparison
  const periodComparison = calculatePeriodComparison(
    leads,
    previousPeriodLeads
  );

  return {
    totalLeads,
    topSource,
    recentLeads24h,
    dailyGrowthRate,
    weeklyGrowthRate,
    syncedToActiveCampaign,
    syncRate,
    periodComparison,
  };
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
} {
  const currentTotal = currentLeads.length;
  const previousTotal = previousLeads.length;

  // Calculate leads change percentage
  const leadsChange = previousTotal > 0
    ? ((currentTotal - previousTotal) / previousTotal) * 100
    : 0;

  return {
    leadsChange,
  };
}
