import { kv } from "@vercel/kv";
import ClientDashboard from "./components/ClientDashboard";
import { enrichStreamer } from "@/lib/streamerMeta";
import { fetchLiveStreamers, mergeStreamerWithLiveScrape } from "@/lib/chzzkScrape";
import { ensureStreamerPalettes } from "@/lib/imagePalette";
import { FALLBACK_STREAMERS } from "@/lib/streamersConfig";

export const revalidate = 0; // Disable server caching to ensure users always see freshly scraped hours

export default async function Home() {
  let streamers = [];
  let milestones = [];

  try {
    // Attempt to fetch from Vercel KV
    for (const fallback of FALLBACK_STREAMERS) {
      const cid = fallback.channelId;
      const data: any = await kv.hgetall(`streamer:${cid}`);
      const history: any = (await kv.get(`streamer:${cid}:history`)) || [
        { date: "2026-05-18", hours: Math.max(0, fallback.totalLiveHours - 4), followers: Math.max(0, (fallback.followerCount || 10000) - 15) },
        { date: "2026-05-19", hours: Math.max(0, fallback.totalLiveHours - 2), followers: Math.max(0, (fallback.followerCount || 10000) - 5) },
        { date: "2026-05-20", hours: Math.max(0, fallback.totalLiveHours), followers: fallback.followerCount || 10000 }
      ];

      if (data) {
        let imageUrl = data.channelImageUrl || fallback.channelImageUrl;
        // Self-healing: If Elsy accidentally has Kiyuu's image URL cached in database, heal it
        if (cid === "6ccaebc2569f62344c6fc257f8f2b9ad" && imageUrl.includes("MjAyNjAyMjJfMjQ1")) {
          imageUrl = fallback.channelImageUrl;
          kv.hset(`streamer:${cid}`, { ...data, channelImageUrl: fallback.channelImageUrl }).catch((e) => {
            console.warn("Failed to self-heal Elsy's image in KV (home):", e);
          });
        }

        streamers.push(
          enrichStreamer({
            channelId: cid,
            channelName: data.channelName || fallback.channelName,
            channelImageUrl: imageUrl,
            firstLiveDate: data.firstLiveDate || fallback.firstLiveDate,
            totalLiveHours: Number(data.totalLiveHours) || fallback.totalLiveHours,
            lastMilestone: Number(data.lastMilestone) || fallback.lastMilestone,
            cheerCount: Number(data.cheerCount) || 0,
            followerCount: Number(data.followerCount) || fallback.followerCount || 0,
            color: data.color || fallback.color,
            cardBg: data.cardBg || undefined,
            cardBorder: data.cardBorder || undefined,
            accentHex: data.accentHex || undefined,
            lastUpdated: data.lastUpdated || new Date().toISOString(),
            history,
          })
        );
      } else {
        const merged = await mergeStreamerWithLiveScrape({
          ...fallback,
          history,
          lastUpdated: new Date().toISOString(),
        });
        streamers.push(enrichStreamer(merged));
      }
    }

    const milestoneRecords: any[] = await kv.lrange("milestones", 0, 49);
    const dbMilestones = milestoneRecords.map((m) => {
      try {
        const parsed = typeof m === "string" ? JSON.parse(m) : m;
        if (!parsed.type) parsed.type = "hours"; // Backwards compatibility
        return parsed;
      } catch {
        return m;
      }
    });

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
      { channelId: "65c3035bdc598c81f15a8fe0e958b3ce", channelName: "초승달", milestone: 4000, type: "hours", date: "2026-04-15T09:00:00.000Z" }
    ];

    const mergedMap = new Map<string, any>();
    dbMilestones.forEach((m) => {
      if (m && m.channelId && m.milestone) {
        const key = `${m.channelId}-${m.milestone}-${m.type || "hours"}`;
        mergedMap.set(key, m);
      }
    });
    fallbackMilestones.forEach((m) => {
      const key = `${m.channelId}-${m.milestone}-${m.type || "hours"}`;
      mergedMap.set(key, m);
    });
    milestones = Array.from(mergedMap.values());

    if (process.env.NODE_ENV === "development" && streamers.length > 0) {
      streamers = await Promise.all(
        streamers.map(async (streamer) => enrichStreamer(await mergeStreamerWithLiveScrape(streamer)))
      );
    }

    streamers = await ensureStreamerPalettes(streamers);
  } catch (err) {
    console.warn("Vercel KV not connected or failed. Scraping Chzzk API directly:", err);
    const liveStreamers = await fetchLiveStreamers(FALLBACK_STREAMERS);
    streamers = liveStreamers.map((f) =>
      enrichStreamer({
        ...f,
        lastUpdated: new Date().toISOString(),
        history: [
          { date: "2026-05-18", hours: Math.max(0, f.totalLiveHours - 4), followers: Math.max(0, (f.followerCount || 10000) - 15) },
          { date: "2026-05-19", hours: Math.max(0, f.totalLiveHours - 2), followers: Math.max(0, (f.followerCount || 10000) - 5) },
          { date: "2026-05-20", hours: Math.max(0, f.totalLiveHours), followers: f.followerCount || 10000 },
        ],
      })
    );
    streamers = await ensureStreamerPalettes(streamers);
    milestones = [
      { channelId: "4de764d9dad3b25602284be6db3ac647", channelName: "아리사", milestone: 7000, type: "hours", date: "2026-05-10T12:00:00.000Z" },
      { channelId: "4de764d9dad3b25602284be6db3ac647", channelName: "아리사", milestone: 90000, type: "followers", date: "2026-05-09T18:00:00.000Z" },
      { channelId: "65c3035bdc598c81f15a8fe0e958b3ce", channelName: "초승달", milestone: 60000, type: "followers", date: "2025-06-02T12:00:00.000Z" },
      { channelId: "65c3035bdc598c81f15a8fe0e958b3ce", channelName: "초승달", milestone: 50000, type: "followers", date: "2025-01-12T12:00:00.000Z" },
      { channelId: "65c3035bdc598c81f15a8fe0e958b3ce", channelName: "초승달", milestone: 30000, type: "followers", date: "2024-04-21T12:00:00.000Z" },
      { channelId: "65c3035bdc598c81f15a8fe0e958b3ce", channelName: "초승달", milestone: 10000, type: "followers", date: "2024-02-28T12:00:00.000Z" },
      { channelId: "a67b328bcc8eea4451ccfa754bc19ae1", channelName: "달콤레나 씨", milestone: 6000, type: "hours", date: "2026-05-02T10:00:00.000Z" },
      { channelId: "475313e6c26639d5763628313b4c130e", channelName: "엘리", milestone: 50000, type: "followers", date: "2026-04-25T11:00:00.000Z" },
      { channelId: "475313e6c26639d5763628313b4c130e", channelName: "엘리", milestone: 5000, type: "hours", date: "2026-04-20T15:00:00.000Z" },
      { channelId: "65c3035bdc598c81f15a8fe0e958b3ce", channelName: "초승달", milestone: 4000, type: "hours", date: "2026-04-15T09:00:00.000Z" }
    ];
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Figma Top Nav Chrome */}
      <header className="sticky top-0 z-50 bg-white border-b border-hairline h-[56px] flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <a href="/" className="font-mono text-[12px] font-bold tracking-mono uppercase hover:text-neutral-500 transition-colors">
            CHZZK MILESTONE
          </a>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="https://chzzk.naver.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden md:inline-flex items-center h-[36px] px-4 rounded-full bg-white text-black text-[14px] font-medium border border-hairline hover:bg-neutral-50 transition-colors"
          >
            치지직 바로가기
          </a>
          <a
            href="#dashboard"
            className="inline-flex items-center justify-center h-[36px] px-5 rounded-full bg-black text-white text-[14px] font-medium hover:bg-neutral-900 transition-colors"
          >
            대시보드 보기
          </a>
        </div>
      </header>

      {/* Main Interactive App Dashboard - Background handled elegantly inside ClientDashboard */}
      <main id="dashboard" className="flex-1 bg-white">
        <ClientDashboard initialStreamers={streamers} initialMilestones={milestones} />
      </main>

      {/* Editorial Figma Footer */}
      <footer className="bg-black text-white py-[96px] px-6 border-t border-neutral-900 mt-auto">
        <div className="max-w-[1280px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-12">
          <div className="md:col-span-2">
            <span className="font-sans text-[24px] font-bold tracking-display-lg block mb-4">
              CHZZK MILESTONE
            </span>
            <p className="font-sans text-[14px] text-neutral-400 max-w-[500px] leading-relaxed">
              본 트래커는 네이버 치지직의 공식 서비스가 아니며, 크리에이터들의 활발한 방송 활동을 응원하고 팬들이 돌파 기록을 축하하기 위해 제작된 팬 메이드 프로젝트입니다.
            </p>
          </div>
          <div>
            <span className="font-mono text-[12px] font-bold tracking-mono uppercase text-neutral-400 block mb-6">
              DATA SOURCES
            </span>
            <ul className="space-y-3 text-[14px] text-neutral-400 font-sans">
              <li>
                <a
                  href="https://api.chzzk.naver.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors"
                >
                  Naver Chzzk Open/Internal API
                </a>
              </li>
              <li>
                <span className="text-neutral-500">Auto Scraped Daily</span>
              </li>
            </ul>
          </div>
        </div>
        <div className="max-w-[1280px] mx-auto border-t border-neutral-900 mt-16 pt-8 flex flex-col md:flex-row items-center justify-between text-[12px] text-neutral-500">
          <span>&copy; 2026 Chzzk Milestone Tracker. Dedicated with love.</span>
          <span className="mt-4 md:mt-0 font-mono tracking-mono uppercase">
            DESIGN ADOPTED FROM FIGMA MARKETING FRAMEWORK
          </span>
        </div>
      </footer>
    </div>
  );
}
