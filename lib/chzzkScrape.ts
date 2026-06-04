const CHZZK_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
};

export type ScrapedChannel = {
  channelName: string;
  channelImageUrl: string;
  followerCount: number;
  firstLiveDate: string;
  totalLiveHours: number;
};

export async function scrapeChzzkChannel(channelId: string): Promise<ScrapedChannel | null> {
  try {
    const [chRes, historyRes] = await Promise.all([
      fetch(`https://api.chzzk.naver.com/service/v1/channels/${channelId}`, {
        headers: CHZZK_HEADERS,
        cache: "no-store",
      }),
      fetch(`https://api.chzzk.naver.com/service/v1/channels/${channelId}/data?fields=channelHistory`, {
        headers: CHZZK_HEADERS,
        cache: "no-store",
      }),
    ]);

    const chData = await chRes.json();
    const historyData = await historyRes.json();

    return {
      channelName: chData.content?.channelName || "",
      channelImageUrl: chData.content?.channelImageUrl || "",
      followerCount: chData.content?.followerCount || 0,
      firstLiveDate: historyData.content?.channelHistory?.firstLiveDate || "",
      totalLiveHours: historyData.content?.channelHistory?.totalLiveHours || 0,
    };
  } catch (err) {
    console.warn(`Chzzk scrape failed for ${channelId}:`, err);
    return null;
  }
}

type StreamerSeed = {
  channelId: string;
  channelName: string;
  channelImageUrl: string;
  firstLiveDate: string;
  totalLiveHours: number;
  lastMilestone: number;
  followerCount?: number;
  [key: string]: unknown;
};

export async function mergeStreamerWithLiveScrape<T extends StreamerSeed>(fallback: T): Promise<T> {
  const live = await scrapeChzzkChannel(fallback.channelId);
  if (!live) return fallback;

  const totalLiveHours = live.totalLiveHours || fallback.totalLiveHours;

  return {
    ...fallback,
    channelName: live.channelName || fallback.channelName,
    channelImageUrl: live.channelImageUrl || fallback.channelImageUrl,
    firstLiveDate: live.firstLiveDate || fallback.firstLiveDate,
    totalLiveHours,
    lastMilestone: Math.max(
      fallback.lastMilestone,
      Math.floor(totalLiveHours / 1000) * 1000
    ),
    followerCount: live.followerCount || fallback.followerCount || 0,
    lastUpdated: new Date().toISOString(),
  };
}

export async function fetchLiveStreamers<T extends StreamerSeed>(fallbacks: T[]): Promise<T[]> {
  return Promise.all(fallbacks.map((fallback) => mergeStreamerWithLiveScrape(fallback)));
}
