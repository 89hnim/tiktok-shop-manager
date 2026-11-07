/**
 * Date formatting & parsing utilities for Vietnamese locale (Day/Month/Year)
 */

/**
 * Format any date string or timestamp into Day/Month/Year (DD/MM/YYYY)
 * @param {string|number|Date} dateVal - Input date (YYYY-MM-DD, ISO string, etc.)
 * @param {boolean} includeTime - Whether to include HH:mm
 * @returns {string} Formatted date string (e.g. "07/11/2026" or "07/11/2026 14:30")
 */
export function formatDateVN(dateVal, includeTime = false) {
  if (!dateVal) return '-';
  const str = String(dateVal).trim();
  if (!str) return '-';

  // Pattern 1: YYYY-MM-DD or YYYY/MM/DD with optional time
  const isoMatch = str.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})(?:[T\s](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (isoMatch) {
    const yyyy = isoMatch[1];
    const mm = String(isoMatch[2]).padStart(2, '0');
    const dd = String(isoMatch[3]).padStart(2, '0');
    if (includeTime && isoMatch[4] !== undefined && isoMatch[5] !== undefined) {
      const hh = String(isoMatch[4]).padStart(2, '0');
      const min = String(isoMatch[5]).padStart(2, '0');
      return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
    }
    return `${dd}/${mm}/${yyyy}`;
  }

  // Pattern 2: DD-MM-YYYY or DD/MM/YYYY with optional time
  const vnMatch = str.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})(?:[T\s](\d{1,2}):(\d{1,2}))?/);
  if (vnMatch) {
    const dd = String(vnMatch[1]).padStart(2, '0');
    const mm = String(vnMatch[2]).padStart(2, '0');
    const yyyy = vnMatch[3];
    if (includeTime && vnMatch[4] !== undefined && vnMatch[5] !== undefined) {
      const hh = String(vnMatch[4]).padStart(2, '0');
      const min = String(vnMatch[5]).padStart(2, '0');
      return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
    }
    return `${dd}/${mm}/${yyyy}`;
  }

  // Fallback: parse with native Date
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    if (includeTime) {
      const hh = String(d.getHours()).padStart(2, '0');
      const min = String(d.getMinutes()).padStart(2, '0');
      return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
    }
    return `${dd}/${mm}/${yyyy}`;
  }

  return str;
}

/**
 * Format date string strictly as Day/Month (DD/MM)
 * e.g. "07/11"
 */
export function formatDayMonthVN(dateVal) {
  const full = formatDateVN(dateVal, false);
  if (full === '-') return '-';
  const parts = full.split('/');
  if (parts.length >= 2) {
    return `${parts[0]}/${parts[1]}`;
  }
  return full;
}

/**
 * Format Month & Year as "Tháng MM/YYYY"
 */
export function formatMonthYearVN(year, month) {
  const mm = String(month).padStart(2, '0');
  return `Tháng ${mm}/${year}`;
}
