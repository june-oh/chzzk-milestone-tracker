import softconHistoryJson from "@/data/softcon-history.json";

export type GroupTag = "Planeta" | "AESTHER";

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

type SoftconChannelHistory = {
  followers?: ManualFollowerPoint[];
  weeklyHours?: ManualWeeklyHoursPoint[];
  cumulativeHours?: ManualHoursPoint[];
  currentFollowers?: number;
};

const SOFTCON_HISTORY = softconHistoryJson as Record<string, SoftconChannelHistory>;

const GROUP_TAGS: Record<string, GroupTag> = {
  "4de764d9dad3b25602284be6db3ac647": "AESTHER", // 아리사
  "32fb866e323242b770cdc790f991a6f6": "AESTHER", // 카린
  "475313e6c26639d5763628313b4c130e": "AESTHER", // 엘리
  "17d8605fc37fb5ef49f5f67ae786fe4e": "AESTHER", // 에리스
  "d5e2e0c14dcca4c4b10c7c9633022f52": "Planeta", // 치치
  "5ead7124638ac4c568f2cde0224b3b6b": "Planeta", // 카네코 파냐
  "941ea3807ba8b9b7dddb1670e3e7e5af": "Planeta", // 아마네 나기
  "59aa824e4c4a56dd51e7a5e2e9172648": "Planeta", // 쿠온 레이
};

function getSoftconEntry(channelId: string): SoftconChannelHistory | undefined {
  const entry = SOFTCON_HISTORY[channelId];
  if (!entry) return undefined;
  return entry;
}

export function getGroupTag(channelId: string): GroupTag | undefined {
  return GROUP_TAGS[channelId];
}

export function getManualFollowerHistory(channelId: string): ManualFollowerPoint[] {
  const fromJson = getSoftconEntry(channelId)?.followers;
  if (fromJson && fromJson.length > 0) return fromJson;
  return [];
}

/** Build monotonic cumulative hours from Softcon weekly bars, scaled to target total. */
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
  const fromJson = getSoftconEntry(channelId)?.weeklyHours;
  if (fromJson && fromJson.length > 0) return fromJson;
  return [];
}

/** Cumulative broadcast hours built from Softcon weekly bars. */
export function getManualCumulativeHoursHistory(
  channelId: string,
  targetTotal?: number
): ManualHoursPoint[] {
  const entry = getSoftconEntry(channelId);
  const weekly = entry?.weeklyHours;
  if (weekly && weekly.length > 0) {
    return buildCumulativeFromWeekly(weekly, targetTotal);
  }
  const fromJson = entry?.cumulativeHours;
  if (fromJson && fromJson.length > 0) return fromJson;
  return [];
}

export function hasSoftconHoursHistory(channelId: string): boolean {
  return (
    getManualWeeklyHoursHistory(channelId).length > 0 ||
    getManualCumulativeHoursHistory(channelId).length > 0
  );
}

export function hasSoftconFollowerHistory(channelId: string): boolean {
  return getManualFollowerHistory(channelId).length > 0;
}

function parseSoftconDateMs(date: string): number {
  if (date.includes("T")) return new Date(date).getTime();
  return new Date(`${date}T12:00:00`).getTime();
}

/** Interpolate when a cumulative series crosses a target value (Softcon-sourced). */
function projectSeriesCrossing(
  history: { date: string; value: number }[],
  target: number
): string | null {
  for (let i = 1; i < history.length; i++) {
    const prev = history[i - 1];
    const curr = history[i];
    if (prev.value <= target && curr.value >= target && curr.value > prev.value) {
      const ratio = (target - prev.value) / (curr.value - prev.value);
      const ms = parseSoftconDateMs(prev.date) + ratio * (parseSoftconDateMs(curr.date) - parseSoftconDateMs(prev.date));
      return new Date(ms).toISOString();
    }
  }
  return null;
}

export function getSoftconHoursMilestoneDate(channelId: string, milestoneHours: number): string | null {
  const entry = getSoftconEntry(channelId);
  const history = getManualCumulativeHoursHistory(
    channelId,
    entry?.cumulativeHours?.[entry.cumulativeHours.length - 1]?.hours
  );
  if (history.length === 0) return null;
  return projectSeriesCrossing(
    history.map((point) => ({ date: point.date, value: point.hours })),
    milestoneHours
  );
}

export function getSoftconFollowerMilestoneDate(channelId: string, milestoneFollowers: number): string | null {
  const history = getManualFollowerHistory(channelId);
  if (history.length === 0) return null;
  return projectSeriesCrossing(
    history.map((point) => ({ date: point.date, value: point.followers })),
    milestoneFollowers
  );
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
      : getSoftconEntry(streamer.channelId)?.currentFollowers;

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
