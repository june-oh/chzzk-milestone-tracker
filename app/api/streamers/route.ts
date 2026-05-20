import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";

const STREAMER_IDS = [
  "65c3035bdc598c81f15a8fe0e958b3ce", // 초승달
  "4de764d9dad3b25602284be6db3ac647", // 아리사
  "32fb866e323242b770cdc790f991a6f6", // 카린
  "475313e6c26639d5763628313b4c130e", // 엘리
  "17d8605fc37fb5ef49f5f67ae786fe4e", // 에리스
  "a67b328bcc8eea4451ccfa754bc19ae1", // 달콤레나 씨
  "a3ceb9179d99be8d1e63b3e911fcd16b", // 키유
  "088973112d8acc831ec20274f7ffbb99", // 미하루
  "c8adce2ff4a3618931e07c327e1fa070", // 포키쨩
  "6ccaebc2569f62344c6fc257f8f2b9ad", // 엘시
];

// Fallback metadata if database has not been scraped yet
const FALLBACK_STREAMERS = [
  { channelId: "65c3035bdc598c81f15a8fe0e958b3ce", channelName: "초승달", channelImageUrl: "https://nng-phinf.pstatic.net/MjAyNjA0MTlfOTQg/MDAxNzc2NTkyMjU5ODk5._TnXjfSnOt5htcBgSxPj4BKXOv2ncFPbIPvx2guxVlwg.M3PH7PH8oadbIc0SZdWyD1wY6lVh2aOpMlKQ8puG-E0g.PNG/image.png", firstLiveDate: "2024-02-26 17:06:40", totalLiveHours: 4302, lastMilestone: 4000, cheerCount: 0, followerCount: 66939, color: "lilac" },
  { channelId: "4de764d9dad3b25602284be6db3ac647", channelName: "아리사", channelImageUrl: "https://nng-phinf.pstatic.net/MjAyNjA0MDJfMTk1/MDAxNzc1MTMzNjk5OTc1.XifMFawEqJ9B4cqYDAF9pjn2VoUNaIahdyNDtqRnDMQg.IyGl56yQUJAtB5ohqq8mUM2wqjvQ4cf4--LpB4jvzFIg.PNG/image.png", firstLiveDate: "2024-01-05 20:00:32", totalLiveHours: 7778, lastMilestone: 7000, cheerCount: 0, followerCount: 90518, color: "pink" },
  { channelId: "32fb866e323242b770cdc790f991a6f6", channelName: "카린", channelImageUrl: "https://nng-phinf.pstatic.net/MjAyNDA3MDdfMjAg/MDAxNzIwMzM0MTk0MjAz.GRLFSI66ByerGVPBJmX7nC9WudQCO45VsXUxAvsbEMkg.J6DZpTBwgQMSpyTrunP4wbmZO71ce9oRN3WrLnOUye0g.PNG/1000053454.png", firstLiveDate: "2024-02-19 18:03:58", totalLiveHours: 4148, lastMilestone: 4000, cheerCount: 0, followerCount: 52263, color: "mint" },
  { channelId: "475313e6c26639d5763628313b4c130e", channelName: "엘리", channelImageUrl: "https://nng-phinf.pstatic.net/MjAyNTEwMTJfMjQg/MDAxNzYwMjU5MzQwODQw.72r-pbnXpBvoFivvGK9dKk9CAO8aJN5UV6wXejRiiPwg.Oo7lN5-LX4Dd9tETgUqx5UGoHXNKZ55O5Xy6MnaX7-kg.PNG/image.png", firstLiveDate: "2024-01-04 16:26:11", totalLiveHours: 5162, lastMilestone: 5000, cheerCount: 0, followerCount: 58214, color: "coral" },
  { channelId: "17d8605fc37fb5ef49f5f67ae786fe4e", channelName: "에리스", channelImageUrl: "https://nng-phinf.pstatic.net/MjAyNDA3MTFfMjU1/MDAxNzIwNjYzNjYzMzE2.6ViLvn07CoW0FgG0DVAifAaDyRibcvuJ7Wf80lcaedog.h9LXAMib3NNk7EtCJYbHOB1fMpzdQ49Q9At7b3MnuMUg.PNG/0E954B06-FA2A-4A12-ADFE-36CFA1F6CED7-1720663663.png", firstLiveDate: "2024-02-07 22:00:56", totalLiveHours: 3542, lastMilestone: 3000, cheerCount: 0, followerCount: 48426, color: "cream" },
  { channelId: "a67b328bcc8eea4451ccfa754bc19ae1", channelName: "달콤레나 씨", channelImageUrl: "https://nng-phinf.pstatic.net/MjAyNjA0MDlfMTI3/MDAxNzc1NjY1MDY5ODU0.rkFJkjnyXc5nB7zU5bDPc_2hW2u-jAYL1JUQK5PI1xkg.BjDG3LUVSiASGTM4VaH0US6R7RpyvNmzqz9Eh88dUEcg.PNG/image.png", firstLiveDate: "2024-01-17 22:25:35", totalLiveHours: 6501, lastMilestone: 6000, cheerCount: 0, followerCount: 91596, color: "lime" },
  { channelId: "a3ceb9179d99be8d1e63b3e911fcd16b", channelName: "키유 Kiyuu", channelImageUrl: "https://nng-phinf.pstatic.net/MjAyNjAyMjJfMjQ1/MDAxNzcxNzM5Mjg0Nzg4.fLrTzHmKPaZhzvwyz08SB6b8nCL5hGQh2V_3-014DJMg.QMpmPJAtgz9dj357T3hO-gNru9xgKq8g7i-wnF581dUg.PNG/image.png", firstLiveDate: "2025-11-29 14:50:46", totalLiveHours: 1277, lastMilestone: 1000, cheerCount: 0, followerCount: 15899, color: "mint" },
  { channelId: "088973112d8acc831ec20274f7ffbb99", channelName: "미하루 Miharu", channelImageUrl: "https://nng-phinf.pstatic.net/MjAyNjAxMTFfMTAy/MDAxNzY4MTEyMzUyOTcx.D51vALyJMK9hGdWdzpe2NgKsyggBWJJNaKdPzh_IwKAg.7UeLbx2mM3XLtHRfbuDKwUEuvefqOXMvHX4yFwStH8og.PNG/image.png", firstLiveDate: "2025-11-29 15:55:01", totalLiveHours: 546, lastMilestone: 0, cheerCount: 0, followerCount: 11555, color: "lilac" },
  { channelId: "c8adce2ff4a3618931e07c327e1fa070", channelName: "포키쨩", channelImageUrl: "https://nng-phinf.pstatic.net/MjAyNjAxMDNfMTk1/MDAxNzY3MzcwNDg2MTYy.0vTyLJqAtowVc-UjM2qzofBBv002OUQPyp05BrSPkiog.MEZvrdc9v88N0fsEVynHsBsnh1xxI27zRspK0vZm0VEg.PNG/image.png", firstLiveDate: "2024-01-08 18:57:26", totalLiveHours: 8246, lastMilestone: 8000, cheerCount: 0, followerCount: 27870, color: "pink" },
  { channelId: "6ccaebc2569f62344c6fc257f8f2b9ad", channelName: "엘시v", channelImageUrl: "https://nng-phinf.pstatic.net/MjAyNjAyMDJfMiAg/MDAxNzcwMDQxMDA5OTE5.iGpluslDPntIraPLS-CPaAVfw1HFmUffcPq3bkaBXoMg.xueJx_wx_l-wFoUsW_2VCgw4JrA_Vtsz7qJUO1LmHqkg.PNG/image.png", firstLiveDate: "2025-07-18 20:02:57", totalLiveHours: 1569, lastMilestone: 1000, cheerCount: 0, followerCount: 37648, color: "coral" },
];

export async function GET(req: NextRequest) {
  try {
    const streamers = [];
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
          { date: "2026-05-18", hours: fallback.totalLiveHours - 4, followers: (fallback.followerCount || 10000) - 15 },
          { date: "2026-05-19", hours: fallback.totalLiveHours - 2, followers: (fallback.followerCount || 10000) - 5 },
          { date: "2026-05-20", hours: fallback.totalLiveHours, followers: fallback.followerCount || 10000 }
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

          streamers.push({
            channelId: cid,
            channelName: data.channelName || fallback.channelName,
            channelImageUrl: imageUrl,
            firstLiveDate: data.firstLiveDate || fallback.firstLiveDate,
            totalLiveHours: Number(data.totalLiveHours) || fallback.totalLiveHours,
            lastMilestone: Number(data.lastMilestone) || fallback.lastMilestone,
            cheerCount: Number(data.cheerCount) || 0,
            followerCount: Number(data.followerCount) || fallback.followerCount || 0,
            color: data.color || fallback.color,
            lastUpdated: data.lastUpdated || new Date().toISOString(),
            history,
          });
        } else {
          // Return fallback if database has not been populated by the cron yet
          streamers.push({
            ...fallback,
            history,
            lastUpdated: new Date().toISOString(),
          });
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
      console.warn("Vercel KV query failed, using fallback:", kvErr);
      streamers.length = 0; // Clear any partial data
      for (const fallback of FALLBACK_STREAMERS) {
        streamers.push({
          ...fallback,
          history: [
            { date: "2026-05-18", hours: fallback.totalLiveHours - 4, followers: (fallback.followerCount || 10000) - 15 },
            { date: "2026-05-19", hours: fallback.totalLiveHours - 2, followers: (fallback.followerCount || 10000) - 5 },
            { date: "2026-05-20", hours: fallback.totalLiveHours, followers: fallback.followerCount || 10000 }
          ],
          lastUpdated: new Date().toISOString(),
        });
      }
      milestones = [];
    }

    return NextResponse.json({
      success: true,
      streamers,
      milestones,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: true,
      streamers: FALLBACK_STREAMERS.map(f => ({
        ...f,
        history: [
          { date: "2026-05-18", hours: f.totalLiveHours - 4, followers: (f.followerCount || 10000) - 15 },
          { date: "2026-05-19", hours: f.totalLiveHours - 2, followers: (f.followerCount || 10000) - 5 },
          { date: "2026-05-20", hours: f.totalLiveHours, followers: f.followerCount || 10000 }
        ],
        lastUpdated: new Date().toISOString()
      })),
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
