import archivedHistoryJson from "@/data/archived-history.json";

export type GroupTag =
  | "CLUEZ"
  | "ENCHANT"
  | "Planeta"
  | "AESTHER"
  | "Honeyz"
  | "ACAXIA"
  | "Listella"
  | "StelLive"
  | "OverTheWall";

export const GROUP_FILTER_ORDER: GroupTag[] = [
  "CLUEZ",
  "ENCHANT",
  "AESTHER",
  "Planeta",
  "Honeyz",
  "ACAXIA",
  "Listella",
  "StelLive",
  "OverTheWall",
];

export type ManualFollowerPoint = {
  date: string;
  followers: number;
};

export type ManualHoursPoint = {
  date: string;
  hours: number;
};

export type ManualWeeklyHoursPoint = {
  date: string;
  weeklyHours: number;
};

type ArchivedChannelHistory = {
  followers?: ManualFollowerPoint[];
  weeklyHours?: ManualWeeklyHoursPoint[];
  cumulativeHours?: ManualHoursPoint[];
  currentFollowers?: number;
};

const ARCHIVED_HISTORY = archivedHistoryJson as Record<string, ArchivedChannelHistory>;

const GROUP_TAGS: Record<string, GroupTag> = {
  "a3ceb9179d99be8d1e63b3e911fcd16b": "CLUEZ", // 키유 Kiyuu
  "088973112d8acc831ec20274f7ffbb99": "CLUEZ", // 미하루 Miharu
  "a67b328bcc8eea4451ccfa754bc19ae1": "ENCHANT", // 달콤레나 씨
  "6ccaebc2569f62344c6fc257f8f2b9ad": "ENCHANT", // 엘시v
  "65c3035bdc598c81f15a8fe0e958b3ce": "ENCHANT", // 초승달
  "4de764d9dad3b25602284be6db3ac647": "AESTHER", // 아리사
  "32fb866e323242b770cdc790f991a6f6": "AESTHER", // 카린
  "475313e6c26639d5763628313b4c130e": "AESTHER", // 엘리
  "17d8605fc37fb5ef49f5f67ae786fe4e": "AESTHER", // 에리스
  "d5e2e0c14dcca4c4b10c7c9633022f52": "Planeta", // 치치
  "5ead7124638ac4c568f2cde0224b3b6b": "Planeta", // 카네코 파냐
  "941ea3807ba8b9b7dddb1670e3e7e5af": "Planeta", // 아마네 나기
  "59aa824e4c4a56dd51e7a5e2e9172648": "Planeta", // 쿠온 레이
  "c0d9723cbb75dc223c6aa8a9d4f56002": "Honeyz", // 허니츄러스
  "65a53076fe1a39636082dd6dba8b8a4b": "Honeyz", // 오화요
  "b82e8bc2505e37156b2d1140ba1fc05c": "Honeyz", // 담유이
  "798e100206987b59805cfb75f927e965": "Honeyz", // 디디디용
  "abe8aa82baf3d3ef54ad8468ee73e7fc": "Honeyz", // 아야
  "bd07973b6021d72512240c01a386d5c9": "Honeyz", // 망내
  "3e3781d3bd20dadc2f6f6d5d30091195": "ACAXIA", // 포포포포
  "5c897b3e639045ca6e314bbaff991f73": "ACAXIA", // 비올레타 모네
  "dae2de8eaa005a59163f2e4c045e1aa1": "ACAXIA", // 블레어 로즈
  "b33c957eac9335d38e4043c3dca97675": "ACAXIA", // 하시요
  "f36320c432d9f06095ce2cfbbf681c26": "ACAXIA", // 류시호
  "e87999abca4fd0c3214e05ef414ce951": "Listella", // 야토
  "f3b204dd3fd6925835ca1848cd4b6d3c": "Listella", // 오단밍
  "9351fb8417f73405c84e0846409e3263": "Listella", // 햄쿠비
  "4325b1d5bbc321fad3042306646e2e50": "StelLive", // 아카네 리제
  "64d76089fba26b180d9c9e48a32600d9": "StelLive", // 텐코 시부키
  "a6c4ddb09cdb160478996007bff35296": "StelLive", // 아라하시 타비
  "4515b179f86b67b4981e16190817c580": "StelLive", // 네네코 마시로
  "b044e3a3b9259246bc92e863e7d3f3b8": "StelLive", // 시라유키 히나
  "45e71a76e949e16a34764deb962f9d9f": "StelLive", // 아야츠노 유니
  "36ddb9bb4f17593b60f1b63cec86611d": "StelLive", // 사키하네 후야
  "516937b5f85cbf2249ce31b0ad046b0f": "StelLive", // 아오쿠모 린
  "4d812b586ff63f8a2946e64fa860bbf5": "StelLive", // 하나코 나나
  "8fd39bb8de623317de90654718638b10": "StelLive", // 유즈하 리코
  "a54372e8197f6d241a43a318279860d6": "OverTheWall", // 쿠레나이 나츠키
  "0a2020b09b8cc7f2285b7ae5de2ce4d3": "OverTheWall", // 테리 눈나
  "a048127622edd6c3ee8e477471a1d823": "OverTheWall", // 빙하유
  "f1869f490ddd660c420b2f57c649e6bb": "OverTheWall", // 양메이
  "29a1ed5c0829fa620fab900dba7e011b": "OverTheWall", // 유리리
  "0f61ae00c2aef2b789dc009e51cbcc5a": "OverTheWall", // 온 하루
  "7b9c6553913c755812ef2cd9fbe1dc5c": "OverTheWall", // 하네
  "f42e97f59c3177b8686dccfbf90792dd": "OverTheWall", // 김아테
};

/** Official Chzzk group debut (not per-member first test stream from API). */
export const GROUP_DEBUT_DATES: Partial<Record<GroupTag, string>> = {
  AESTHER: "2024-02-07",
  Honeyz: "2024-02-07",
  StelLive: "2024-02-07",
  CLUEZ: "2025-11-29",
  ACAXIA: "2025-09-13",
  Listella: "2024-09-15",
};

/** Per-member debut overrides (group debut differs or member joined later). */
const CHANNEL_DEBUT_DATES: Record<string, string> = {
  "36ddb9bb4f17593b60f1b63cec86611d": "2025-09-20", // 사키하네 후야 (StelLive)
  "941ea3807ba8b9b7dddb1670e3e7e5af": "2026-05-30", // 아마네 나기 (Planeta)
  "5ead7124638ac4c568f2cde0224b3b6b": "2026-05-30", // 카네코 파냐 (Planeta)
  "59aa824e4c4a56dd51e7a5e2e9172648": "2026-05-31", // 쿠온 레이 (Planeta)
  "d5e2e0c14dcca4c4b10c7c9633022f52": "2026-05-31", // 치치 (Planeta)
  "dae2de8eaa005a59163f2e4c045e1aa1": "2025-09-13", // 블레어 로즈 (ACAXIA)
  "b33c957eac9335d38e4043c3dca97675": "2025-09-14", // 하시요 (ACAXIA)
  "f36320c432d9f06095ce2cfbbf681c26": "2025-09-14", // 류시호 (ACAXIA)
};

/** Listella sub-unit debut; 야토 등 솔로 활동 후 합류 멤버는 개인 firstLiveDate 유지. */
const LISTELLA_GROUP_DEBUT_IDS = new Set([
  "f3b204dd3fd6925835ca1848cd4b6d3c", // 오단밍
  "9351fb8417f73405c84e0846409e3263", // 햄쿠비
]);

/** Group or per-member configured debut only (excludes API firstLiveDate). */
export function getConfiguredDebutDate(channelId: string): string | undefined {
  if (CHANNEL_DEBUT_DATES[channelId]) {
    return CHANNEL_DEBUT_DATES[channelId];
  }

  const group = getGroupTag(channelId);
  if (group && GROUP_DEBUT_DATES[group]) {
    if (group === "Listella" && !LISTELLA_GROUP_DEBUT_IDS.has(channelId)) {
      return undefined;
    }
    return GROUP_DEBUT_DATES[group];
  }

  return undefined;
}

export function getDebutReferenceDate(channelId: string, firstLiveDate?: string): string | undefined {
  const configured = getConfiguredDebutDate(channelId);
  if (configured) return configured;

  const trimmed = firstLiveDate?.trim();
  return trimmed || undefined;
}

function getArchivedHistoryEntry(channelId: string): ArchivedChannelHistory | undefined {
  const entry = ARCHIVED_HISTORY[channelId];
  if (!entry) return undefined;
  return entry;
}

export function getGroupTag(channelId: string): GroupTag | undefined {
  return GROUP_TAGS[channelId];
}

export function getManualFollowerHistory(channelId: string): ManualFollowerPoint[] {
  const fromJson = getArchivedHistoryEntry(channelId)?.followers;
  if (fromJson && fromJson.length > 0) return fromJson;
  return [];
}

/** Build monotonic cumulative hours from archived weekly bars, scaled to target total. */
export function buildCumulativeFromWeekly(
  weekly: ManualWeeklyHoursPoint[],
  targetTotal?: number
): ManualHoursPoint[] {
  if (weekly.length === 0) return [];

  let sum = 0;
  const rawCumulative = weekly.map((week) => {
    sum += week.weeklyHours;
    return { date: week.date, hours: Math.round(sum) };
  });

  const target = targetTotal ?? rawCumulative[rawCumulative.length - 1]?.hours ?? 0;
  const rawTotal = rawCumulative[rawCumulative.length - 1]?.hours ?? 0;
  if (target <= 0 || rawTotal <= 0 || Math.abs(rawTotal - target) <= 5) {
    if (rawCumulative.length > 0) {
      rawCumulative[rawCumulative.length - 1] = {
        ...rawCumulative[rawCumulative.length - 1],
        hours: target || rawTotal,
      };
    }
    return rawCumulative;
  }

  const scale = target / rawTotal;
  let cumulative = 0;
  return weekly.map((week, index) => {
    cumulative += week.weeklyHours * scale;
    const hours = index === weekly.length - 1 ? target : Math.round(cumulative);
    return { date: week.date, hours };
  });
}

export function getManualWeeklyHoursHistory(channelId: string): ManualWeeklyHoursPoint[] {
  const fromJson = getArchivedHistoryEntry(channelId)?.weeklyHours;
  if (fromJson && fromJson.length > 0) return fromJson;
  return [];
}

function parseDateOnlyMs(dateStr: string): number {
  const match = String(dateStr).trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return NaN;
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

/** Drop pre-debut scrape noise and anchor charts at official debut (0h). */
export function sanitizeHoursHistoryForChart(
  points: ManualHoursPoint[],
  debutDate?: string,
  targetTotal?: number
): ManualHoursPoint[] {
  if (points.length === 0 || !debutDate) return points;

  const debutMs = parseDateOnlyMs(debutDate);
  if (!Number.isFinite(debutMs)) return points;

  const debutDay = debutDate.slice(0, 10);
  const onOrAfterDebut = [...points]
    .sort((a, b) => a.date.localeCompare(b.date))
    .filter((p) => parseDateOnlyMs(p.date) >= debutMs);

  const result: ManualHoursPoint[] = [{ date: debutDay, hours: 0 }];

  for (const point of onOrAfterDebut) {
    if (parseDateOnlyMs(point.date) === debutMs && point.hours <= 0) continue;
    result.push(point);
  }

  if (result.length === 1 && targetTotal !== undefined && targetTotal > 0) {
    result.push({ date: new Date().toISOString().slice(0, 10), hours: Math.round(targetTotal) });
  }

  if (targetTotal !== undefined && result.length > 0) {
    const last = result[result.length - 1];
    result[result.length - 1] = { ...last, hours: Math.round(targetTotal) };
  }

  return result;
}

/** Cumulative broadcast hours built from archived weekly bars. */
export function getManualCumulativeHoursHistory(
  channelId: string,
  targetTotal?: number
): ManualHoursPoint[] {
  const entry = getArchivedHistoryEntry(channelId);
  const weekly = entry?.weeklyHours;
  if (weekly && weekly.length > 0) {
    return buildCumulativeFromWeekly(weekly, targetTotal);
  }
  const fromJson = entry?.cumulativeHours;
  if (fromJson && fromJson.length > 0) return fromJson;
  return [];
}

export function hasArchivedHoursHistory(channelId: string): boolean {
  return (
    getManualWeeklyHoursHistory(channelId).length > 0 ||
    getManualCumulativeHoursHistory(channelId).length > 0
  );
}

export function hasArchivedFollowerHistory(channelId: string): boolean {
  return getManualFollowerHistory(channelId).length > 0;
}

function parseHistoryDateMs(date: string): number {
  if (date.includes("T")) return new Date(date).getTime();
  return new Date(`${date}T12:00:00`).getTime();
}

/** Interpolate when a cumulative series crosses a target value. */
function projectSeriesCrossing(
  history: { date: string; value: number }[],
  target: number
): string | null {
  for (let i = 1; i < history.length; i++) {
    const prev = history[i - 1];
    const curr = history[i];
    if (prev.value <= target && curr.value >= target && curr.value > prev.value) {
      const ratio = (target - prev.value) / (curr.value - prev.value);
      const ms = parseHistoryDateMs(prev.date) + ratio * (parseHistoryDateMs(curr.date) - parseHistoryDateMs(prev.date));
      return new Date(ms).toISOString();
    }
  }
  return null;
}

export function getArchivedHoursMilestoneDate(
  channelId: string,
  milestoneHours: number,
  targetTotal?: number,
  debutDate?: string
): string | null {
  const entry = getArchivedHistoryEntry(channelId);
  const resolvedTarget = targetTotal ?? entry?.cumulativeHours?.[entry.cumulativeHours.length - 1]?.hours;
  let history = getManualCumulativeHoursHistory(channelId, resolvedTarget);
  if (debutDate) {
    history = sanitizeHoursHistoryForChart(history, debutDate, resolvedTarget);
  }
  if (history.length === 0) return null;
  return projectSeriesCrossing(
    history.map((point) => ({ date: point.date, value: point.hours })),
    milestoneHours
  );
}

export function getArchivedFollowerMilestoneDate(channelId: string, milestoneFollowers: number): string | null {
  const history = getManualFollowerHistory(channelId);
  if (history.length === 0) return null;
  return projectSeriesCrossing(
    history.map((point) => ({ date: point.date, value: point.followers })),
    milestoneFollowers
  );
}

export type BroadcastActivityBar = {
  key: string;
  label: string;
  hours: number;
};

export type BroadcastActivityRange = "7d" | "30d" | "90d";

function dayKey(dateStr: string): string {
  return dateStr.slice(0, 10);
}

function addUtcDays(dateStr: string, days: number): string {
  const ms = parseDateOnlyMs(dayKey(dateStr)) + days * 86_400_000;
  return new Date(ms).toISOString().slice(0, 10);
}

function distributeHoursEvenly(
  startDay: string,
  endDay: string,
  totalHours: number,
  daily: Map<string, number>
) {
  if (totalHours <= 0 || startDay > endDay) return;

  const days: string[] = [];
  let current = startDay;
  while (current <= endDay) {
    days.push(current);
    current = addUtcDays(current, 1);
  }

  if (days.length === 0) return;

  let remaining = totalHours;
  for (let index = 0; index < days.length; index++) {
    const day = days[index];
    const slotsLeft = days.length - index;
    const room = MAX_DAILY_BROADCAST_HOURS - (daily.get(day) || 0);
    if (room <= 0) continue;
    const share = index === days.length - 1 ? remaining : Math.min(room, remaining / slotsLeft);
    const applied = Math.min(room, share);
    if (applied <= 0) continue;
    daily.set(day, (daily.get(day) || 0) + applied);
    remaining -= applied;
  }
}

/** One calendar day cannot exceed 24 broadcast hours. */
const MAX_DAILY_BROADCAST_HOURS = 24;

function spreadHoursAcrossDays(
  daily: Map<string, number>,
  startDay: string,
  endDay: string,
  totalHours: number
) {
  if (totalHours <= 0 || startDay > endDay) return;

  if (startDay === endDay) {
    assignDailyHours(daily, startDay, totalHours);
    return;
  }

  distributeHoursEvenly(startDay, endDay, totalHours, daily);
}

function assignDailyHours(daily: Map<string, number>, day: string, hours: number) {
  if (hours <= 0) return;
  daily.set(day, Math.min(MAX_DAILY_BROADCAST_HOURS, Math.max(daily.get(day) || 0, hours)));
}

function weeklyHoursToDailyMap(weekly: ManualWeeklyHoursPoint[]): Map<string, number> {
  const daily = new Map<string, number>();
  const sorted = [...weekly].sort((a, b) => a.date.localeCompare(b.date));
  if (sorted.length === 0) return daily;

  for (const point of sorted) {
    const periodEnd = dayKey(point.date);
    const hours = point.weeklyHours;
    if (hours <= 0) continue;

    // Archive bars are weekly totals; snapshot dates can be weeks apart.
    const periodStart = addUtcDays(periodEnd, -6);

    if (periodStart >= periodEnd) {
      assignDailyHours(daily, periodEnd, hours);
    } else {
      spreadHoursAcrossDays(daily, periodStart, periodEnd, hours);
    }
  }

  return daily;
}

function cumulativeHoursToDailyMap(cumulative: ManualHoursPoint[]): Map<string, number> {
  const daily = new Map<string, number>();
  const sorted = [...cumulative].sort((a, b) => a.date.localeCompare(b.date));

  for (let index = 1; index < sorted.length; index++) {
    const prev = sorted[index - 1];
    const curr = sorted[index];
    const delta = curr.hours - prev.hours;
    if (delta <= 0) continue;

    const gapDays =
      (parseDateOnlyMs(dayKey(curr.date)) - parseDateOnlyMs(dayKey(prev.date))) / 86_400_000;
    const startDay = addUtcDays(dayKey(prev.date), 1);
    const endDay = dayKey(curr.date);

    if (gapDays <= 1 && delta <= MAX_DAILY_BROADCAST_HOURS) {
      assignDailyHours(daily, endDay, delta);
    } else {
      spreadHoursAcrossDays(daily, startDay, endDay, delta);
    }
  }

  return daily;
}

function kvHistoryToDailyMap(history: { date: string; hours: number }[]): Map<string, number> {
  const daily = new Map<string, number>();
  const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date));

  for (let index = 1; index < sorted.length; index++) {
    const prev = sorted[index - 1];
    const curr = sorted[index];
    const delta = curr.hours - prev.hours;
    if (delta <= 0) continue;

    const gapDays =
      (parseDateOnlyMs(dayKey(curr.date)) - parseDateOnlyMs(dayKey(prev.date))) / 86_400_000;
    const startDay = addUtcDays(dayKey(prev.date), 1);
    const endDay = dayKey(curr.date);

    if (gapDays <= 1 && delta <= MAX_DAILY_BROADCAST_HOURS) {
      assignDailyHours(daily, endDay, delta);
    } else {
      spreadHoursAcrossDays(daily, startDay, endDay, delta);
    }
  }

  return daily;
}

function mergeDailyMaps(...maps: Map<string, number>[]): Map<string, number> {
  const merged = new Map<string, number>();

  for (const map of maps) {
    for (const [day, hours] of map) {
      if (hours > 0) {
        merged.set(day, Math.min(MAX_DAILY_BROADCAST_HOURS, Math.max(merged.get(day) || 0, hours)));
      }
    }
  }

  return merged;
}

/** Build a day → broadcast hours map for activity charts (never scale to live API totals). */
export function buildDailyBroadcastHoursMap(
  channelId: string,
  streamerHistory: { date: string; hours: number }[] = []
): Map<string, number> {
  const weeklyDaily = weeklyHoursToDailyMap(getManualWeeklyHoursHistory(channelId));
  const cumulativeDaily = cumulativeHoursToDailyMap(getManualCumulativeHoursHistory(channelId));
  const kvDaily = kvHistoryToDailyMap(streamerHistory);

  // Prefer archived weekly distribution; KV only fills gaps (no overwrite spikes).
  const merged = mergeDailyMaps(weeklyDaily);
  for (const [day, hours] of cumulativeDaily) {
    if (!merged.has(day) || (merged.get(day) || 0) <= 0) {
      merged.set(day, Math.min(MAX_DAILY_BROADCAST_HOURS, hours));
    }
  }
  for (const [day, hours] of kvDaily) {
    if (!merged.has(day) || (merged.get(day) || 0) <= 0) {
      merged.set(day, Math.min(MAX_DAILY_BROADCAST_HOURS, hours));
    }
  }

  return merged;
}

function sumDailyHoursInRange(dailyMap: Map<string, number>, startDay: string, endDay: string): number {
  let total = 0;
  for (let current = startDay; current <= endDay; current = addUtcDays(current, 1)) {
    total += dailyMap.get(current) || 0;
  }
  return Math.round(total * 10) / 10;
}

function getWeekStartMonday(dateStr: string): string {
  const date = new Date(parseDateOnlyMs(dayKey(dateStr)));
  const weekday = date.getUTCDay();
  const diff = weekday === 0 ? -6 : 1 - weekday;
  date.setUTCDate(date.getUTCDate() + diff);
  return date.toISOString().slice(0, 10);
}

function formatActivityDayLabel(dateStr: string): string {
  const [, month, day] = dayKey(dateStr).split("-");
  return `${month}/${day}`;
}

function formatActivityWeekLabel(weekStart: string): string {
  const end = addUtcDays(weekStart, 6);
  return `${formatActivityDayLabel(weekStart)}~${formatActivityDayLabel(end)}`;
}

export function resolveBroadcastActivityEndDay(
  channelId: string,
  streamerHistory: { date: string; hours: number }[] = [],
  lastUpdated?: string
): string {
  const candidates = [
    lastUpdated ? dayKey(lastUpdated) : "",
    ...getManualWeeklyHoursHistory(channelId).map((point) => dayKey(point.date)),
    ...streamerHistory.map((point) => dayKey(point.date)),
  ].filter(Boolean);

  if (candidates.length === 0) {
    return new Date().toISOString().slice(0, 10);
  }

  return candidates.sort().at(-1)!;
}

export function getBroadcastActivityBars(
  channelId: string,
  streamerHistory: { date: string; hours: number }[] = [],
  range: BroadcastActivityRange = "7d",
  referenceEndDay?: string
): { bars: BroadcastActivityBar[]; periodTotal: number } {
  const endDay = referenceEndDay || resolveBroadcastActivityEndDay(channelId, streamerHistory);
  const lookbackDays = range === "7d" ? 6 : range === "30d" ? 29 : 89;
  const startDay = addUtcDays(endDay, -lookbackDays);
  const dailyMap = buildDailyBroadcastHoursMap(channelId, streamerHistory);
  const periodTotal = sumDailyHoursInRange(dailyMap, startDay, endDay);

  if (range === "90d") {
    const weekMap = new Map<string, number>();
    for (let current = startDay; current <= endDay; current = addUtcDays(current, 1)) {
      const weekKey = getWeekStartMonday(current);
      weekMap.set(weekKey, (weekMap.get(weekKey) || 0) + (dailyMap.get(current) || 0));
    }

    const bars = Array.from(weekMap.entries())
      .filter(([, hours]) => hours > 0)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, hours]) => ({
        key,
        label: formatActivityWeekLabel(key),
        hours: Math.round(hours * 10) / 10,
      }));

    return { bars, periodTotal };
  }

  const bars: BroadcastActivityBar[] = [];
  for (let current = startDay; current <= endDay; current = addUtcDays(current, 1)) {
    const dayHours = Math.min(MAX_DAILY_BROADCAST_HOURS, dailyMap.get(current) || 0);
    bars.push({
      key: current,
      label: formatActivityDayLabel(current),
      hours: Math.round(dayHours * 10) / 10,
    });
  }

  return { bars, periodTotal };
}

export function hasBroadcastActivityData(
  channelId: string,
  streamerHistory: { date: string; hours: number }[] = []
): boolean {
  const daily = buildDailyBroadcastHoursMap(channelId, streamerHistory);
  return daily.size > 0 || getManualWeeklyHoursHistory(channelId).length > 0;
}

type StreamerHistoryRow = {
  date: string;
  hours: number;
  followers?: number;
};

type EnrichableStreamer = {
  channelId: string;
  totalLiveHours: number;
  followerCount?: number;
  groupTag?: GroupTag;
  history?: StreamerHistoryRow[];
};

export function enrichStreamer<T extends EnrichableStreamer>(streamer: T): T {
  const groupTag = getGroupTag(streamer.channelId);
  const manualFollowers = getManualFollowerHistory(streamer.channelId);
  const manualHours = getManualCumulativeHoursHistory(
    streamer.channelId,
    streamer.totalLiveHours
  );
  const historyByDate = new Map<string, StreamerHistoryRow>();

  (streamer.history || []).forEach((row) => {
    historyByDate.set(row.date, { ...row });
  });

  manualHours.forEach((point) => {
    const existing = historyByDate.get(point.date);
    historyByDate.set(point.date, {
      date: point.date,
      hours: point.hours,
      followers: existing?.followers,
    });
  });

  manualFollowers.forEach((point) => {
    const existing = historyByDate.get(point.date);
    historyByDate.set(point.date, {
      date: point.date,
      hours: existing?.hours ?? streamer.totalLiveHours,
      followers: point.followers,
    });
  });

  const mergedHistory =
    manualFollowers.length > 0 || manualHours.length > 0 || historyByDate.size > 0
      ? Array.from(historyByDate.values()).sort((a, b) => a.date.localeCompare(b.date))
      : streamer.history;

  const latestManualFollowers =
    manualFollowers.length > 0
      ? manualFollowers[manualFollowers.length - 1].followers
      : getArchivedHistoryEntry(streamer.channelId)?.currentFollowers;

  const latestManualHours =
    manualHours.length > 0 ? manualHours[manualHours.length - 1].hours : undefined;

  return {
    ...streamer,
    ...(groupTag ? { groupTag } : {}),
    ...(mergedHistory ? { history: mergedHistory } : {}),
    ...(latestManualFollowers !== undefined
      ? { followerCount: Math.max(streamer.followerCount || 0, latestManualFollowers) }
      : {}),
    ...(latestManualHours !== undefined
      ? { totalLiveHours: Math.max(streamer.totalLiveHours, Math.round(latestManualHours)) }
      : {}),
  };
}
