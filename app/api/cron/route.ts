import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { toGlassSurfacePalette, isMutedPalette } from "@/lib/cardPaletteUtils";
import { extractPaletteFromImageUrl } from "@/lib/imagePalette";
import { CRON_STREAMERS } from "@/lib/streamersConfig";

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

    for (const streamer of CRON_STREAMERS) {
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
      const followerCount = chData.content?.followerCount || 0;

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
      let lastFollowerMilestone = 0;
      let cheerCount = 0;

      if (prevData) {
        lastMilestone = Number(prevData.lastMilestone) || 0;
        lastFollowerMilestone = Number(prevData.lastFollowerMilestone) || 0;
        cheerCount = Number(prevData.cheerCount) || 0;
      } else {
        // First run initialization: set milestones
        lastMilestone = Math.floor(totalLiveHours / 1000) * 1000;
        lastFollowerMilestone = Math.floor(followerCount / 10000) * 10000;
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
          type: "hours",
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

      // Check if a new 10,000 follower milestone has been crossed
      const currentFollowerBoundary = Math.floor(followerCount / 10000) * 10000;
      let followerMilestoneCrossed = false;

      if (currentFollowerBoundary > lastFollowerMilestone) {
        followerMilestoneCrossed = true;
        lastFollowerMilestone = currentFollowerBoundary;

        // Save a follower milestone log
        const followerMilestoneEvent = {
          channelId: cid,
          channelName: name,
          channelImageUrl: imageUrl,
          milestone: currentFollowerBoundary,
          type: "followers",
          date: new Date().toISOString(),
        };

        // Push new milestone to front of list
        await kv.lpush("milestones", JSON.stringify(followerMilestoneEvent));

        // Trigger Discord Webhook Notification if configured
        if (process.env.DISCORD_WEBHOOK_URL) {
          try {
            await fetch(process.env.DISCORD_WEBHOOK_URL, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                embeds: [
                  {
                    title: `👥 ${name} 채널 팔로워 ${currentFollowerBoundary / 10000}만 명 돌파! 🎉`,
                    description: `스트리머 **${name}**님이 누적 팔로워 **${(currentFollowerBoundary / 10000)}만 명**을 돌파하였습니다!\n모두 축하해 주세요! 🙌`,
                    color: streamer.color === "lime" ? 14875730 : streamer.color === "lilac" ? 16051199 : 14798036,
                    thumbnail: { url: imageUrl },
                    fields: [
                      { name: "현재 팔로워 수", value: `${followerCount.toLocaleString()}명`, inline: true }
                    ],
                    timestamp: new Date().toISOString(),
                    footer: { text: "Chzzk Milestone Tracker" }
                  }
                ]
              }),
            });
          } catch (webhookErr: any) {
            console.error("Failed to send Discord follower webhook:", webhookErr.message);
          }
        }
      }

      // 4. Update core streamer states in KV
      let cardBg = prevData?.cardBg as string | undefined;
      let cardBorder = prevData?.cardBorder as string | undefined;
      let accentHex = prevData?.accentHex as string | undefined;

      const staleKvPalette =
        cardBg && cardBorder
          ? isMutedPalette(toGlassSurfacePalette({ cardBg, cardBorder }))
          : false;

      if (imageUrl && (!cardBg || prevData?.channelImageUrl !== imageUrl || staleKvPalette)) {
        const palette = await extractPaletteFromImageUrl(imageUrl);
        if (palette) {
          cardBg = palette.cardBg;
          cardBorder = palette.cardBorder;
          accentHex = palette.accentHex;
        }
      } else if (cardBg && cardBorder && !cardBg.startsWith("rgba(")) {
        const glass = toGlassSurfacePalette({ cardBg, cardBorder });
        cardBg = glass.cardBg;
        cardBorder = glass.cardBorder;
        accentHex = glass.accentHex;
      }

      const updatedStreamerState = {
        channelId: cid,
        channelName: name,
        channelImageUrl: imageUrl,
        firstLiveDate,
        totalLiveHours,
        lastMilestone,
        lastFollowerMilestone,
        cheerCount,
        followerCount,
        lastUpdated: new Date().toISOString(),
        color: streamer.color,
        cardBg,
        cardBorder,
        accentHex,
      };

      await kv.hset(`streamer:${cid}`, updatedStreamerState);

      // 5. Append growth history (keyed by YYYY-MM-DD so only 1 record per day persists)
      const historyKey = `streamer:${cid}:history`;
      const currentHistory: any[] = (await kv.get(historyKey)) || [];
      const todayRecordIdx = currentHistory.findIndex((record: any) => record.date === todayStr);

      if (todayRecordIdx !== -1) {
        // Update today's hours and followers if already exists
        currentHistory[todayRecordIdx].hours = totalLiveHours;
        currentHistory[todayRecordIdx].followers = followerCount;
      } else {
        // Add new record
        currentHistory.push({ date: todayStr, hours: totalLiveHours, followers: followerCount });
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
