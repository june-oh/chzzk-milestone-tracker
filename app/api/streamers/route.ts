import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { enrichStreamer } from "@/lib/streamerMeta";
import { fetchLiveStreamers } from "@/lib/chzzkScrape";
import { loadMilestonesFromKv, loadStreamersFromKv } from "@/lib/loadStreamersFromKv";
import { FALLBACK_STREAMERS, STREAMER_IDS } from "@/lib/streamersConfig";

export async function GET(req: NextRequest) {
  try {
    let streamers: Awaited<ReturnType<typeof loadStreamersFromKv>> = [];
    let milestones: Awaited<ReturnType<typeof loadMilestonesFromKv>> = [];

    let shouldUpdate = false;
    try {
      const firstCid = STREAMER_IDS[0];
      const firstData: any = await kv.hgetall(`streamer:${firstCid}`);
      if (firstData && firstData.lastUpdated) {
        const lastUpdatedTime = new Date(firstData.lastUpdated).getTime();
        if (Date.now() - lastUpdatedTime > 1000 * 60 * 60) {
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
      fetch(`${protocol}://${host}/api/cron?bypass=true`).catch((e) => {
        console.warn("Background SWR cron failed to run:", e.message);
      });
    }

    try {
      [streamers, milestones] = await Promise.all([loadStreamersFromKv(), loadMilestonesFromKv()]);
    } catch (kvErr) {
      console.warn("Vercel KV query failed, using live scrape fallback:", kvErr);
      const liveStreamers = await fetchLiveStreamers(FALLBACK_STREAMERS);
      streamers = liveStreamers.map((fallback) =>
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
      milestones = [];
    }

    return NextResponse.json({
      success: true,
      streamers,
      milestones,
    });
  } catch (error: any) {
    const liveStreamers = await fetchLiveStreamers(FALLBACK_STREAMERS);
    const streamers = liveStreamers.map((f) =>
      enrichStreamer({
        ...f,
        history: [
          { date: "2026-05-18", hours: Math.max(0, f.totalLiveHours - 4), followers: Math.max(0, (f.followerCount || 10000) - 15) },
          { date: "2026-05-19", hours: Math.max(0, f.totalLiveHours - 2), followers: Math.max(0, (f.followerCount || 10000) - 5) },
          { date: "2026-05-20", hours: Math.max(0, f.totalLiveHours), followers: f.followerCount || 10000 },
        ],
        lastUpdated: new Date().toISOString(),
      })
    );
    return NextResponse.json({
      success: true,
      streamers,
      milestones: await loadMilestonesFromKv().catch(() => []),
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { channelId } = await req.json();

    if (!channelId || !STREAMER_IDS.includes(channelId)) {
      return NextResponse.json({ success: false, error: "Invalid Channel ID" }, { status: 400 });
    }

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
          followerCount: fallback.followerCount || 0,
          cheerCount: 0,
          color: fallback.color,
          lastUpdated: new Date().toISOString(),
        });
      }
    }

    const newCount = await kv.hincrby(`streamer:${channelId}`, "cheerCount", 1);
    return NextResponse.json({ success: true, cheerCount: newCount });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
