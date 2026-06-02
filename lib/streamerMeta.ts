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
