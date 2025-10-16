import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/**
 * Formats launch date for pre-sale products
 * @param date JavaScript Date or Firebase Timestamp
 * @returns Formatted date string in pt-BR format (e.g., "01/12/2025")
 */
export function formatLaunchDate(date: Date | { toDate: () => Date } | null | undefined): string {
  if (!date) return '';

  const jsDate = date instanceof Date ? date : date.toDate();
  return format(jsDate, 'dd/MM/yyyy', { locale: ptBR });
}

/**
 * Formats support expiration date
 * @param date JavaScript Date or Firebase Timestamp
 * @returns Formatted date string with full month name (e.g., "15 de janeiro de 2026")
 */
export function formatSupportExpiration(date: Date | { toDate: () => Date } | null | undefined): string {
  if (!date) return '';

  const jsDate = date instanceof Date ? date : date.toDate();
  return format(jsDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
}

/**
 * Checks if a product is launching soon (within next 30 days)
 * @param launchDate Launch date
 * @returns True if launching soon
 */
export function isLaunchingSoon(launchDate: Date | { toDate: () => Date } | null | undefined): boolean {
  if (!launchDate) return false;

  const jsDate = launchDate instanceof Date ? launchDate : launchDate.toDate();
  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  return jsDate >= now && jsDate <= thirtyDaysFromNow;
}

/**
 * Formats a relative date (e.g., "em 5 dias", "daqui a 2 meses")
 * @param date Future date
 * @returns Relative date string in Portuguese
 */
export function formatRelativeDate(date: Date | { toDate: () => Date }): string {
  const jsDate = date instanceof Date ? date : date.toDate();
  const now = new Date();
  const diffMs = jsDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'em breve';
  if (diffDays === 0) return 'hoje';
  if (diffDays === 1) return 'amanhã';
  if (diffDays < 7) return `em ${diffDays} dias`;
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `em ${weeks} ${weeks === 1 ? 'semana' : 'semanas'}`;
  }

  const months = Math.floor(diffDays / 30);
  return `em ${months} ${months === 1 ? 'mês' : 'meses'}`;
}
