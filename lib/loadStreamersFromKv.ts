import { kv } from "@vercel/kv";
import { enrichStreamer } from "@/lib/streamerMeta";
import { FALLBACK_STREAMERS } from "@/lib/streamersConfig";

const DEFAULT_HISTORY = (fallback: (typeof FALLBACK_STREAMERS)[number]) => [
  {
    date: "2026-05-18",
    hours: Math.max(0, fallback.totalLiveHours - 4),
    followers: Math.max(0, (fallback.followerCount || 10000) - 15),
  },
  {
    date: "2026-05-19",
    hours: Math.max(0, fallback.totalLiveHours - 2),
    followers: Math.max(0, (fallback.followerCount || 10000) - 5),
  },
  {
    date: "2026-05-20",
    hours: Math.max(0, fallback.totalLiveHours),
    followers: fallback.followerCount || 10000,
  },
];

const ELSY_CHANNEL_ID = "6ccaebc2569f62344c6fc257f8f2b9ad";

async function loadOneStreamerFromKv(fallback: (typeof FALLBACK_STREAMERS)[number]) {
  const cid = fallback.channelId;

  const [data, historyRaw] = await Promise.all([
    kv.hgetall(`streamer:${cid}`),
    kv.get(`streamer:${cid}:history`),
  ]);

  const history = (Array.isArray(historyRaw) ? historyRaw : null) || DEFAULT_HISTORY(fallback);

  if (data && Object.keys(data).length > 0) {
    let imageUrl = (data.channelImageUrl as string) || fallback.channelImageUrl;

    if (cid === ELSY_CHANNEL_ID && imageUrl.includes("MjAyNjAyMjJfMjQ1")) {
      imageUrl = fallback.channelImageUrl;
      kv.hset(`streamer:${cid}`, { ...data, channelImageUrl: fallback.channelImageUrl }).catch((e) => {
        console.warn("Failed to self-heal Elsy's image in KV:", e);
      });
    }

    return enrichStreamer({
      channelId: cid,
      channelName: (data.channelName as string) || fallback.channelName,
      channelImageUrl: imageUrl,
      firstLiveDate: (data.firstLiveDate as string) || fallback.firstLiveDate,
      totalLiveHours: Number(data.totalLiveHours) || fallback.totalLiveHours,
      lastMilestone: Number(data.lastMilestone) || fallback.lastMilestone,
      cheerCount: Number(data.cheerCount) || 0,
      followerCount: Number(data.followerCount) || fallback.followerCount || 0,
      color: (data.color as string) || fallback.color,
      cardBg: (data.cardBg as string) || undefined,
      cardBorder: (data.cardBorder as string) || undefined,
      accentHex: (data.accentHex as string) || undefined,
      lastUpdated: (data.lastUpdated as string) || new Date().toISOString(),
      history,
    });
  }

  return enrichStreamer({
    ...fallback,
    history,
    lastUpdated: new Date().toISOString(),
  });
}

/** Load all streamers from KV in parallel (one round-trip pair per streamer, not sequential). */
export async function loadStreamersFromKv() {
  return Promise.all(FALLBACK_STREAMERS.map((fallback) => loadOneStreamerFromKv(fallback)));
}

export async function loadMilestonesFromKv() {
  const fallbackMilestones = [
    { channelId: "4de764d9dad3b25602284be6db3ac647", channelName: "아리사", milestone: 7000, type: "hours", date: "2026-05-10T12:00:00.000Z" },
    { channelId: "4de764d9dad3b25602284be6db3ac647", channelName: "아리사", milestone: 90000, type: "followers", date: "2026-05-09T18:00:00.000Z" },
    { channelId: "65c3035bdc598c81f15a8fe0e958b3ce", channelName: "초승달", milestone: 60000, type: "followers", date: "2025-06-02T12:00:00.000Z" },
    { channelId: "65c3035bdc598c81f15a8fe0e958b3ce", channelName: "초승달", milestone: 50000, type: "followers", date: "2025-01-12T12:00:00.000Z" },
    { channelId: "65c3035bdc598c81f15a8fe0e958b3ce", channelName: "초승달", milestone: 30000, type: "followers", date: "2024-04-21T12:00:00.000Z" },
    { channelId: "65c3035bdc598c81f15a8fe0e958b3ce", channelName: "초승달", milestone: 10000, type: "followers", date: "2024-02-28T12:00:00.000Z" },
    { channelId: "a67b328bcc8eea4451ccfa754bc19ae1", channelName: "달콤레나 씨", milestone: 6000, type: "hours", date: "2026-05-02T10:00:00.000Z" },
    { channelId: "475313e6c26639d5763628313b4c130e", channelName: "엘리", milestone: 50000, type: "followers", date: "2026-04-25T11:00:00.000Z" },
    { channelId: "475313e6c26639d5763628313b4c130e", channelName: "엘리", milestone: 10000, type: "followers", date: "2024-02-21T12:00:00.000Z" },
    { channelId: "475313e6c26639d5763628313b4c130e", channelName: "엘리", milestone: 5000, type: "hours", date: "2026-04-20T15:00:00.000Z" },
    { channelId: "65c3035bdc598c81f15a8fe0e958b3ce", channelName: "초승달", milestone: 4000, type: "hours", date: "2026-04-15T09:00:00.000Z" },
  ];

  try {
    const milestoneRecords: unknown[] = await kv.lrange("milestones", 0, 49);
    const dbMilestones = milestoneRecords.map((m) => {
      try {
        const parsed = typeof m === "string" ? JSON.parse(m) : m;
        if (parsed && !parsed.type) parsed.type = "hours";
        return parsed;
      } catch {
        return m;
      }
    });

    const mergedMap = new Map<string, unknown>();
    dbMilestones.forEach((m: any) => {
      if (m && m.channelId && m.milestone) {
        mergedMap.set(`${m.channelId}-${m.milestone}-${m.type || "hours"}`, m);
      }
    });
    fallbackMilestones.forEach((m) => {
      mergedMap.set(`${m.channelId}-${m.milestone}-${m.type || "hours"}`, m);
    });
    return Array.from(mergedMap.values());
  } catch {
    return fallbackMilestones;
  }
}
