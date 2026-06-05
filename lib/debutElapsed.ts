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

/** Elapsed days since debut in KST (debut day = D+1, inclusive — matches common D-day calculators). */
export function getDebutDayCount(firstLiveDate: string | Date | undefined, now = new Date()): number | null {
  if (!firstLiveDate) return null;

  const debutParts =
    firstLiveDate instanceof Date ? getKstCalendarParts(firstLiveDate) : parseCalendarDate(String(firstLiveDate));
  if (!debutParts) return null;

  const today = getKstCalendarParts(now);
  const diff = calendarDayDiff(debutParts, today);
  if (diff < 0) return null;
  return diff + 1;
}

/** D+N badge for profile cards (debut day = D+1, KST). */
export function formatDebutDPlus(firstLiveDate: string | Date | undefined, now = new Date()): string | null {
  const days = getDebutDayCount(firstLiveDate, now);
  if (days === null) return null;
  return `D+${days}`;
}

/** Human-readable elapsed time since debut (KST calendar). */
export function formatDebutElapsed(firstLiveDate: string | Date | undefined, now = new Date()): string | null {
  const days = getDebutDayCount(firstLiveDate, now);
  if (days === null || !firstLiveDate) return null;

  const debutParts =
    firstLiveDate instanceof Date ? getKstCalendarParts(firstLiveDate) : parseCalendarDate(String(firstLiveDate));
  if (!debutParts) return null;

  const today = getKstCalendarParts(now);
  let years = today.year - debutParts.year;
  let months = today.month - debutParts.month;
  if (today.day < debutParts.day) months--;
  if (months < 0) {
    years--;
    months += 12;
  }

  if (years <= 0 && months <= 0) {
    return days < 30 ? `${days}일` : "1개월 미만";
  }

  const parts: string[] = [];
  if (years > 0) parts.push(`${years}년`);
  if (months > 0) parts.push(`${months}개월`);
  return parts.join(" ");
}

export type DebutAnniversaryMilestone = {
  label: string;
  targetDay: number;
  daysUntil: number;
  kind: "100days" | "year";
};

export type CommemorativeEvent = {
  label: string;
  daysUntil: number;
  dLabel: string;
  kind: "100days" | "year" | "birthday";
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

/** Days until next birthday in KST (D-N countdown). */
export function getNextBirthdayEvent(birthdayMmDd: string | undefined, now = new Date()): CommemorativeEvent | null {
  if (!birthdayMmDd) return null;
  const [mm, dd] = birthdayMmDd.split("-").map(Number);
  if (!mm || !dd) return null;

  const today = getKstCalendarParts(now);
  let targetYear = today.year;
  let target: CalendarParts = { year: targetYear, month: mm - 1, day: dd };
  let daysUntil = calendarDayDiff(today, target);

  if (daysUntil < 0) {
    targetYear += 1;
    target = { year: targetYear, month: mm - 1, day: dd };
    daysUntil = calendarDayDiff(today, target);
  }

  return {
    label: "생일",
    daysUntil,
    dLabel: daysUntil === 0 ? "D-Day" : `D-${daysUntil}`,
    kind: "birthday",
  };
}

/** Closest upcoming debut anniversary or birthday (KST). */
export function getNextCommemorativeEvent(
  debutDate: string | undefined,
  birthdayMmDd: string | undefined,
  now = new Date()
): CommemorativeEvent | null {
  const candidates: CommemorativeEvent[] = [];

  const debut = getNextDebutAnniversary(debutDate, now);
  if (debut) {
    candidates.push({
      label: debut.label,
      daysUntil: debut.daysUntil,
      dLabel: `D+${debut.targetDay}`,
      kind: debut.kind,
    });
  }

  const birthday = getNextBirthdayEvent(birthdayMmDd, now);
  if (birthday) candidates.push(birthday);

  if (candidates.length === 0) return null;

  return candidates.sort(
    (a, b) =>
      a.daysUntil - b.daysUntil ||
      (a.kind === "birthday" ? -1 : 0) - (b.kind === "birthday" ? -1 : 0)
  )[0];
}
