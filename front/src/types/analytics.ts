import { Timestamp } from "firebase/firestore";

/**
 * Aggregated metrics for dashboard KPIs
 */
export interface LeadsMetrics {
  totalLeads: number;
  topSource: {
    name: string;
    count: number;
    percentage: number;
  };
  recentLeads24h: number;
  dailyGrowthRate: number; // percentage change vs. yesterday
  weeklyGrowthRate: number; // percentage change vs. last week
  syncedToActiveCampaign: number; // count with activecampaign data
  syncRate: number; // percentage synced
  periodComparison: {
    leadsChange: number; // percentage change vs. previous period
  };
}

/**
 * Data point for time-series charts
 */
export interface TimeSeriesDataPoint {
  date: string; // Format: "YYYY-MM-DD" or "MMM DD"
  leads: number;
  [key: string]: string | number | undefined; // Index signature for MUI X Charts compatibility
}

/**
 * Data point for source/medium/campaign distribution
 */
export interface DistributionDataPoint {
  id: string; // Unique identifier
  label: string; // Display name (source/medium/campaign)
  value: number; // Count
  percentage?: number; // Optional calculated percentage
}

/**
 * Aggregated campaign performance data
 */
export interface CampaignPerformance {
  campaign: string;
  source: string;
  medium: string;
  totalLeads: number;
  [key: string]: string | number; // Index signature for MUI X Charts compatibility
}

/**
 * Date range filter options
 */
export interface DateRangeFilter {
  startDate: Date | null;
  endDate: Date | null;
  preset?: '7d' | '30d' | '90d' | 'custom';
}

/**
 * UTM filter options for data grid
 */
export interface UTMFilters {
  source: string;
  medium: string;
  campaign: string;
  term: string;
  content: string;
}

/**
 * Enhanced lead data for table display
 */
export interface LeadTableRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  createdAt: Timestamp;

  // Last Touch UTM (primary attribution)
  source: string;
  medium: string;
  campaign: string;
  term: string;
  content: string;

  // First Touch UTM (for multi-touch analysis)
  firstTouchSource: string;
  firstTouchMedium: string;

  // Conversion metrics
  downloads24h: number;
  isConverted: boolean;
  recaptchaScore: number;
}

/**
 * Hourly lead data for time-based analytics
 */
export interface HourlyLeadData {
  hour: number; // 0-23
  leads: number;
  [key: string]: string | number | undefined; // MUI X Charts compatibility
}

/**
 * Daily lead data for time-based analytics
 */
export interface DailyLeadData {
  dayOfWeek: string; // "Monday", "Tuesday", etc.
  dayIndex: number; // 0=Monday, 6=Sunday
  leads: number;
  [key: string]: string | number | undefined; // MUI X Charts compatibility
}
