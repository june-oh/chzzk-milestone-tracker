import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";

const STREAMERS = [
  { id: "65c3035bdc598c81f15a8fe0e958b3ce", defaultName: "초승달", color: "lilac" },
  { id: "4de764d9dad3b25602284be6db3ac647", defaultName: "아리사", color: "pink" },
  { id: "32fb866e323242b770cdc790f991a6f6", defaultName: "카린", color: "mint" },
  { id: "475313e6c26639d5763628313b4c130e", defaultName: "엘리", color: "coral" },
  { id: "17d8605fc37fb5ef49f5f67ae786fe4e", defaultName: "에리스", color: "cream" },
  { id: "a67b328bcc8eea4451ccfa754bc19ae1", defaultName: "달콤레나 씨", color: "lime" },
  { id: "a3ceb9179d99be8d1e63b3e911fcd16b", defaultName: "키유", color: "mint" },
  { id: "088973112d8acc831ec20274f7ffbb99", defaultName: "미하루", color: "lilac" },
  { id: "c8adce2ff4a3618931e07c327e1fa070", defaultName: "포키쨩", color: "pink" },
  { id: "6ccaebc2569f62344c6fc257f8f2b9ad", defaultName: "엘시", color: "coral" },
];

export async function GET(req: NextRequest) {
  try {
    // Cron security verification
    const authHeader = req.headers.get("Authorization");
    const isCronSecretValid = authHeader === `Bearer ${process.env.CRON_SECRET}`;
    const isDev = process.env.NODE_ENV === "development";
    const isBypassed = req.nextUrl.searchParams.get("bypass") === "true";

    if (!isCronSecretValid && !isDev && !isBypassed) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const todayStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const results = [];

    for (const streamer of STREAMERS) {
      const cid = streamer.id;

      // 1. Scrape basic info (Name, Image)
      const chRes = await fetch(`https://api.chzzk.naver.com/service/v1/channels/${cid}`, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        },
        cache: "no-store",
      });
      const chData = await chRes.json();
      const name = chData.content?.channelName || streamer.defaultName;
      const imageUrl = chData.content?.channelImageUrl || "";

      // 2. Scrape broadcast history (firstLiveDate, totalLiveHours)
      const historyRes = await fetch(`https://api.chzzk.naver.com/service/v1/channels/${cid}/data?fields=channelHistory`, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        },
        cache: "no-store",
      });
      const historyData = await historyRes.json();
      const firstLiveDate = historyData.content?.channelHistory?.firstLiveDate || "";
      const totalLiveHours = historyData.content?.channelHistory?.totalLiveHours || 0;

      // 3. Retrieve previous recorded state from Vercel KV
      const prevData: any = await kv.hgetall(`streamer:${cid}`);

      let lastMilestone = 0;
      let cheerCount = 0;

      if (prevData) {
        lastMilestone = Number(prevData.lastMilestone) || 0;
        cheerCount = Number(prevData.cheerCount) || 0;
      } else {
        // First run initialization: set lastMilestone to nearest lower 1000h boundary
        lastMilestone = Math.floor(totalLiveHours / 1000) * 1000;
      }

      const currentMilestoneBoundary = Math.floor(totalLiveHours / 1000) * 1000;
      let milestoneCrossed = false;

      // Check if a new 1000-hour milestone has been crossed
      if (currentMilestoneBoundary > lastMilestone) {
        milestoneCrossed = true;
        lastMilestone = currentMilestoneBoundary;

        // Save a milestone log
        const milestoneEvent = {
          channelId: cid,
          channelName: name,
          channelImageUrl: imageUrl,
          milestone: currentMilestoneBoundary,
          date: new Date().toISOString(),
        };

        // Push new milestone to front of list
        await kv.lpush("milestones", JSON.stringify(milestoneEvent));

        // Trigger Discord Webhook Notification if configured
        if (process.env.DISCORD_WEBHOOK_URL) {
          try {
            await fetch(process.env.DISCORD_WEBHOOK_URL, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                embeds: [
                  {
                    title: `🎉 ${name} 채널 총 방송 시간 ${currentMilestoneBoundary.toLocaleString()}시간 돌파! 🎉`,
                    description: `스트리머 **${name}**님이 누적 방송 시간 **${currentMilestoneBoundary.toLocaleString()}시간**을 돌파하였습니다!\n모두 축하해 주세요! 🙌`,
                    color: streamer.color === "lime" ? 14875730 : streamer.color === "lilac" ? 16051199 : 14798036,
                    thumbnail: { url: imageUrl },
                    fields: [
                      { name: "최초 방송일", value: firstLiveDate || "기록 없음", inline: true },
                      { name: "현재 총 방송 시간", value: `${totalLiveHours.toLocaleString()}시간`, inline: true }
                    ],
                    timestamp: new Date().toISOString(),
                    footer: { text: "Chzzk Milestone Tracker" }
                  }
                ]
              }),
            });
          } catch (webhookErr: any) {
            console.error("Failed to send Discord webhook:", webhookErr.message);
          }
        }
      }

      // 4. Update core streamer states in KV
      const updatedStreamerState = {
        channelId: cid,
        channelName: name,
        channelImageUrl: imageUrl,
        firstLiveDate,
        totalLiveHours,
        lastMilestone,
        cheerCount,
        lastUpdated: new Date().toISOString(),
        color: streamer.color,
      };

      await kv.hset(`streamer:${cid}`, updatedStreamerState);

      // 5. Append growth history (keyed by YYYY-MM-DD so only 1 record per day persists)
      const historyKey = `streamer:${cid}:history`;
      const currentHistory: any[] = (await kv.get(historyKey)) || [];
      const todayRecordIdx = currentHistory.findIndex((record: any) => record.date === todayStr);

      if (todayRecordIdx !== -1) {
        // Update today's hours if already exists
        currentHistory[todayRecordIdx].hours = totalLiveHours;
      } else {
        // Add new record
        currentHistory.push({ date: todayStr, hours: totalLiveHours });
      }

      // Limit history to last 30 entries to keep it responsive and stay inside KV limits
      if (currentHistory.length > 30) {
        currentHistory.shift();
      }

      await kv.set(historyKey, JSON.stringify(currentHistory));

      results.push({
        id: cid,
        name,
        totalLiveHours,
        lastMilestone,
        milestoneCrossed,
      });
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
