import softconHistoryJson from "@/data/softcon-history.json";

export type GroupTag = "Planeta" | "ESTHER";

export type ManualFollowerPoint = {
  date: string;
  followers: number;
};

export type ManualHoursPoint = {
  date: string;
  hours: number;
};

type SoftconChannelHistory = {
  followers?: ManualFollowerPoint[];
  cumulativeHours?: ManualHoursPoint[];
  currentFollowers?: number;
};

const SOFTCON_HISTORY = softconHistoryJson as Record<string, SoftconChannelHistory>;

const GROUP_TAGS: Record<string, GroupTag> = {
  "4de764d9dad3b25602284be6db3ac647": "ESTHER", // 아리사
  "32fb866e323242b770cdc790f991a6f6": "ESTHER", // 카린
  "475313e6c26639d5763628313b4c130e": "ESTHER", // 엘리
  "17d8605fc37fb5ef49f5f67ae786fe4e": "ESTHER", // 에리스
  "d5e2e0c14dcca4c4b10c7c9633022f52": "Planeta", // 치치
  "5ead7124638ac4c568f2cde0224b3b6b": "Planeta", // 카네코 파냐
  "941ea3807ba8b9b7dddb1670e3e7e5af": "Planeta", // 아마네 나기
  "59aa824e4c4a56dd51e7a5e2e9172648": "Planeta", // 쿠온 레이
};

/** Fallback until softcon-history.json is regenerated for all streamers. */
const ARISA_MANUAL_FOLLOWER_HISTORY: ManualFollowerPoint[] = [
  { date: "2024-04-29", followers: 0 },
  { date: "2024-05-12", followers: 6745 },
  { date: "2024-05-24", followers: 18647 },
  { date: "2024-06-06", followers: 21424 },
  { date: "2024-06-18", followers: 24598 },
  { date: "2024-07-01", followers: 28168 },
  { date: "2024-07-14", followers: 31342 },
  { date: "2024-07-26", followers: 34516 },
  { date: "2024-08-08", followers: 36896 },
  { date: "2024-08-21", followers: 38087 },
  { date: "2024-09-02", followers: 38483 },
  { date: "2024-09-15", followers: 39277 },
  { date: "2024-09-27", followers: 40467 },
  { date: "2024-10-10", followers: 41657 },
  { date: "2024-10-23", followers: 42451 },
  { date: "2024-11-04", followers: 42847 },
  { date: "2024-11-17", followers: 43641 },
  { date: "2024-11-29", followers: 44038 },
  { date: "2024-12-12", followers: 46021 },
  { date: "2024-12-25", followers: 46815 },
  { date: "2025-01-06", followers: 47608 },
  { date: "2025-01-19", followers: 48005 },
  { date: "2025-01-31", followers: 48799 },
  { date: "2025-02-13", followers: 50782 },
  { date: "2025-02-26", followers: 52766 },
  { date: "2025-03-17", followers: 54353 },
  { date: "2025-03-29", followers: 54750 },
  { date: "2025-04-11", followers: 55146 },
  { date: "2025-04-23", followers: 56337 },
  { date: "2025-05-06", followers: 57527 },
  { date: "2025-05-19", followers: 58320 },
  { date: "2025-05-31", followers: 58717 },
  { date: "2025-06-13", followers: 59510 },
  { date: "2025-06-25", followers: 60304 },
  { date: "2025-07-08", followers: 60701 },
  { date: "2025-07-21", followers: 61494 },
  { date: "2025-08-02", followers: 61891 },
  { date: "2025-08-15", followers: 63081 },
  { date: "2025-08-28", followers: 63874 },
  { date: "2025-09-09", followers: 65065 },
  { date: "2025-09-22", followers: 65858 },
  { date: "2025-10-11", followers: 68635 },
  { date: "2025-10-23", followers: 69826 },
  { date: "2025-11-05", followers: 70619 },
  { date: "2025-11-18", followers: 71412 },
  { date: "2025-11-30", followers: 72206 },
  { date: "2025-12-13", followers: 72999 },
  { date: "2025-12-25", followers: 74190 },
  { date: "2026-01-07", followers: 75380 },
  { date: "2026-01-20", followers: 76967 },
  { date: "2026-02-01", followers: 78554 },
  { date: "2026-02-14", followers: 79744 },
  { date: "2026-02-26", followers: 81331 },
  { date: "2026-03-11", followers: 82521 },
  { date: "2026-03-24", followers: 83711 },
  { date: "2026-04-05", followers: 84505 },
  { date: "2026-04-18", followers: 86092 },
  { date: "2026-04-30", followers: 88869 },
  { date: "2026-05-13", followers: 90059 },
  { date: "2026-05-26", followers: 91646 },
  { date: "2026-06-01", followers: 91646 },
];

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
  if (channelId === "4de764d9dad3b25602284be6db3ac647") return ARISA_MANUAL_FOLLOWER_HISTORY;
  return [];
}

/** Cumulative broadcast hours built from Softcon weekly bars. */
export function getManualCumulativeHoursHistory(channelId: string): ManualHoursPoint[] {
  const fromJson = getSoftconEntry(channelId)?.cumulativeHours;
  if (fromJson && fromJson.length > 0) return fromJson;
  return [];
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
  const manualHours = getManualCumulativeHoursHistory(streamer.channelId);
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
