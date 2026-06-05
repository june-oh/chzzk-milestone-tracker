const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

type CalendarParts = { year: number; month: number; day: number };

function getKstCalendarParts(date: Date): CalendarParts {
  const kst = new Date(date.getTime() + KST_OFFSET_MS);
  return {
    year: kst.getUTCFullYear(),
    month: kst.getUTCMonth(),
    day: kst.getUTCDate(),
  };
}

function parseCalendarDate(dateStr: string): CalendarParts | null {
  const trimmed = String(dateStr).trim();
  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  return { year: Number(match[1]), month: Number(match[2]) - 1, day: Number(match[3]) };
}

function calendarDayDiff(from: CalendarParts, to: CalendarParts): number {
  const fromUtc = Date.UTC(from.year, from.month, from.day);
  const toUtc = Date.UTC(to.year, to.month, to.day);
  return Math.floor((toUtc - fromUtc) / (1000 * 60 * 60 * 24));
}

/** Days since debut in KST (debut day = D+0). */
export function getDebutDayCount(firstLiveDate: string | Date | undefined, now = new Date()): number | null {
  if (!firstLiveDate) return null;

  const debutParts =
    firstLiveDate instanceof Date ? getKstCalendarParts(firstLiveDate) : parseCalendarDate(String(firstLiveDate));
  if (!debutParts) return null;

  const today = getKstCalendarParts(now);
  const diff = calendarDayDiff(debutParts, today);
  return diff < 0 ? null : diff;
}

/** D+N badge for profile cards (debut day = D+0, KST). */
export function formatDebutDPlus(firstLiveDate: string | Date | undefined, now = new Date()): string | null {
  const days = getDebutDayCount(firstLiveDate, now);
  if (days === null) return null;
  return `D+${days}`;
}

export type DebutAnniversaryMilestone = {
  label: string;
  targetDay: number;
  daysUntil: number;
  kind: "100days" | "year";
};

/** Nearest upcoming debut anniversary at 100-day or 1-year (365-day) intervals (KST). */
export function getNextDebutAnniversary(
  debutDate: string | undefined,
  now = new Date()
): DebutAnniversaryMilestone | null {
  const current = getDebutDayCount(debutDate, now);
  if (current === null) return null;

  const candidates: DebutAnniversaryMilestone[] = [];

  const next100Day =
    current > 0 && current % 100 === 0 ? current : Math.ceil((current + 1) / 100) * 100;
  candidates.push({
    label: `${next100Day}일`,
    targetDay: next100Day,
    daysUntil: next100Day - current,
    kind: "100days",
  });

  const nextYearDay =
    current > 0 && current % 365 === 0 ? current : Math.ceil((current + 1) / 365) * 365;
  const yearNum = nextYearDay / 365;
  candidates.push({
    label: `${yearNum}주년`,
    targetDay: nextYearDay,
    daysUntil: nextYearDay - current,
    kind: "year",
  });

  return candidates.sort(
    (a, b) => a.daysUntil - b.daysUntil || (a.kind === "year" ? -1 : 1)
  )[0];
}
