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

function calendarDiff(from: Date, to: Date) {
  let years = to.getFullYear() - from.getFullYear();
  let months = to.getMonth() - from.getMonth();
  let days = to.getDate() - from.getDate();

  if (days < 0) {
    months -= 1;
    days += new Date(to.getFullYear(), to.getMonth(), 0).getDate();
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  return { years, months, days };
}

/** Human-readable elapsed time since debut (Korean, calendar-based). */
export function formatDebutElapsed(firstLiveDate: string | Date | undefined, now = new Date()): string | null {
  const debut = firstLiveDate ? parseDebutDate(firstLiveDate) : null;
  if (!debut) return null;

  const diffMs = now.getTime() - debut.getTime();
  if (diffMs < 0) return null;

  const totalDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (totalDays === 0) return "데뷔 당일";

  const { years, months, days } = calendarDiff(debut, now);

  if (years > 0) {
    return months > 0 ? `데뷔 ${years}년 ${months}개월` : `데뷔 ${years}년`;
  }
  if (months > 0) {
    return days > 0 ? `데뷔 ${months}개월 ${days}일` : `데뷔 ${months}개월`;
  }
  return `데뷔 ${totalDays}일`;
}
