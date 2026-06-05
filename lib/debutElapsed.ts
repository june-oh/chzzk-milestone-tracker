function parseDebutDate(firstLiveDate: string | Date): Date | null {
  if (firstLiveDate instanceof Date) {
    return Number.isNaN(firstLiveDate.getTime()) ? null : firstLiveDate;
  }

  let formatted = String(firstLiveDate).trim();
  if (!formatted) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(formatted)) {
    formatted = `${formatted}T00:00:00`;
  } else if (formatted.includes(" ") && !formatted.includes("T")) {
    formatted = formatted.replace(" ", "T");
  }

  const debut = new Date(formatted);
  return Number.isNaN(debut.getTime()) ? null : debut;
}

/** Days since debut (debut day = 0). */
export function getDebutDayCount(firstLiveDate: string | Date | undefined, now = new Date()): number | null {
  if (!firstLiveDate) return null;
  const debut = parseDebutDate(firstLiveDate);
  if (!debut) return null;

  const diffMs = now.getTime() - debut.getTime();
  if (diffMs < 0) return null;

  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/** D+N badge for profile cards (debut day = D+0). */
export function formatDebutDPlus(firstLiveDate: string | Date | undefined, now = new Date()): string | null {
  const days = getDebutDayCount(firstLiveDate, now);
  if (days === null) return null;
  return `D+${days}`;
}
