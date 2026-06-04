import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { enrichStreamer } from "@/lib/streamerMeta";
import { fetchLiveStreamers, mergeStreamerWithLiveScrape } from "@/lib/chzzkScrape";
import { ensureStreamerPalettes } from "@/lib/imagePalette";
import { FALLBACK_STREAMERS, STREAMER_IDS } from "@/lib/streamersConfig";

export async function GET(req: NextRequest) {
  try {
    let streamers = [];
    let milestones = [];

    // On-demand hourly background SWR scraper trigger
    let shouldUpdate = false;
    try {
      const firstCid = STREAMER_IDS[0];
      const firstData: any = await kv.hgetall(`streamer:${firstCid}`);
      if (firstData && firstData.lastUpdated) {
        const lastUpdatedTime = new Date(firstData.lastUpdated).getTime();
        const now = Date.now();
        if (now - lastUpdatedTime > 1000 * 60 * 60) { // 1 hour threshold
          shouldUpdate = true;
        }
      } else {
        shouldUpdate = true;
      }
    } catch (kvErr) {
      console.warn("SWR Check failed:", kvErr);
    }

    if (shouldUpdate) {
      const host = req.headers.get("host") || "localhost:3000";
      const protocol = host.includes("localhost") || host.includes("127.0.0.1") ? "http" : "https";
      // Fire-and-forget background scrape so the response returns instantly (SWR)
      fetch(`${protocol}://${host}/api/cron?bypass=true`).catch((e) => {
        console.warn("Background SWR cron failed to run:", e.message);
      });
    }

    try {
      for (const fallback of FALLBACK_STREAMERS) {
        const cid = fallback.channelId;
        
        // 1. Fetch streamer details from KV
        const data: any = await kv.hgetall(`streamer:${cid}`);
        
        // 2. Fetch history from KV
        const history: any = (await kv.get(`streamer:${cid}:history`)) || [
          // Seed default history matching fallback totalLiveHours for visual aesthetics
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
              console.warn("Failed to self-heal Elsy's image in KV (api):", e);
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

      // 3. Fetch milestones log
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
    } catch (kvErr) {
      console.warn("Vercel KV query failed, scraping Chzzk API directly:", kvErr);
      streamers.length = 0;
      const liveStreamers = await fetchLiveStreamers(FALLBACK_STREAMERS);
      for (const fallback of liveStreamers) {
        streamers.push(
          enrichStreamer({
            ...fallback,
            history: [
              { date: "2026-05-18", hours: Math.max(0, fallback.totalLiveHours - 4), followers: Math.max(0, (fallback.followerCount || 10000) - 15) },
              { date: "2026-05-19", hours: Math.max(0, fallback.totalLiveHours - 2), followers: Math.max(0, (fallback.followerCount || 10000) - 5) },
              { date: "2026-05-20", hours: Math.max(0, fallback.totalLiveHours), followers: fallback.followerCount || 10000 },
            ],
            lastUpdated: new Date().toISOString(),
          })
        );
      }
      milestones = [];
    }

    if (process.env.NODE_ENV === "development" && streamers.length > 0) {
      streamers = await Promise.all(
        streamers.map(async (streamer) =>
          enrichStreamer(await mergeStreamerWithLiveScrape(streamer))
        )
      );
    }

    streamers = await ensureStreamerPalettes(streamers);

    return NextResponse.json({
      success: true,
      streamers,
      milestones,
    });
  } catch (error: any) {
    const liveStreamers = await fetchLiveStreamers(FALLBACK_STREAMERS);
    const streamers = await ensureStreamerPalettes(
      liveStreamers.map((f) =>
        enrichStreamer({
          ...f,
          history: [
            { date: "2026-05-18", hours: Math.max(0, f.totalLiveHours - 4), followers: Math.max(0, (f.followerCount || 10000) - 15) },
            { date: "2026-05-19", hours: Math.max(0, f.totalLiveHours - 2), followers: Math.max(0, (f.followerCount || 10000) - 5) },
            { date: "2026-05-20", hours: Math.max(0, f.totalLiveHours), followers: f.followerCount || 10000 },
          ],
          lastUpdated: new Date().toISOString(),
        })
      )
    );
    return NextResponse.json({
      success: true,
      streamers,
      milestones: [
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
      ]
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { channelId } = await req.json();

    if (!channelId || !STREAMER_IDS.includes(channelId)) {
      return NextResponse.json({ success: false, error: "Invalid Channel ID" }, { status: 400 });
    }

    // Ensure the key exists in KV before incrementing cheerCount, otherwise seed it from fallbacks
    const exists = await kv.exists(`streamer:${channelId}`);
    if (!exists) {
      const fallback = FALLBACK_STREAMERS.find((f) => f.channelId === channelId);
      if (fallback) {
        await kv.hset(`streamer:${channelId}`, {
          channelId: fallback.channelId,
          channelName: fallback.channelName,
          channelImageUrl: fallback.channelImageUrl,
          firstLiveDate: fallback.firstLiveDate,
          totalLiveHours: fallback.totalLiveHours,
          lastMilestone: fallback.lastMilestone,
          cheerCount: 0,
          color: fallback.color,
          lastUpdated: new Date().toISOString(),
        });
      }
    }

    const updatedCheerCount = await kv.hincrby(`streamer:${channelId}`, "cheerCount", 1);

    return NextResponse.json({
      success: true,
      channelId,
      cheerCount: updatedCheerCount,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
