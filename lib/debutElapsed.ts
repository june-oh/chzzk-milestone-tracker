/** Human-readable elapsed time since debut (Korean). */
export function formatDebutElapsed(firstLiveDate: string | Date | undefined, now = new Date()): string | null {
  if (!firstLiveDate) return null;

  const debut =
    firstLiveDate instanceof Date
      ? firstLiveDate
      : (() => {
          let formatted = String(firstLiveDate).trim();
          if (formatted.includes(" ") && !formatted.includes("T")) {
            formatted = formatted.replace(" ", "T");
          }
          return new Date(formatted);
        })();

  if (Number.isNaN(debut.getTime())) return null;

  const diffMs = now.getTime() - debut.getTime();
  if (diffMs < 0) return null;

  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days === 0) return "데뷔 당일";
  if (days >= 365) {
    const years = Math.floor(days / 365);
    const months = Math.floor((days % 365) / 30);
    return months > 0 ? `데뷔 ${years}년 ${months}개월` : `데뷔 ${years}년`;
  }
  if (days >= 30) {
    const months = Math.floor(days / 30);
    const remDays = days % 30;
    return remDays > 0 ? `데뷔 ${months}개월 ${remDays}일` : `데뷔 ${months}개월`;
  }
  return `데뷔 ${days}일`;
}
