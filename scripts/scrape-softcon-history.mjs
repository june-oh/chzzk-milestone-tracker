/**
 * Scrape Softcon Viewership history for tracked streamers.
 *
 * - Followers: summary page line chart (?activityDate=all)
 * - Hours: statistics weekly bars (?period=week&range=all) → cumulative sum
 *
 * Usage:
 *   node scripts/scrape-softcon-history.mjs              # all 46 from streamersConfig
 *   node scripts/scrape-softcon-history.mjs --missing-only  # only channels without data
 *   node scripts/scrape-softcon-history.mjs --id=<channelId>
 */

import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { chromium } from "playwright";

const __dirname = dirname(fileURLToPath(import.meta.url));

const SOFTCON_BASE = "https://viewership.softc.one/channel/naverchzzk";

function parseRangeText(text) {
  const match = text.match(/(\d{2})\.(\d{2})\.(\d{2})\s*~\s*(\d{2})\.(\d{2})\.(\d{2})/);
  if (!match) return null;
  const [, sy, sm, sd, ey, em, ed] = match.map(Number);
  return {
    start: new Date(2000 + sy, sm - 1, sd),
    end: new Date(2000 + ey, em - 1, ed),
  };
}

function hasHistory(entry) {
  if (!entry || entry.meta?.error) return false;
  return (entry.cumulativeHours?.length ?? 0) > 0 || (entry.followers?.length ?? 0) > 0;
}

function buildCumulativeHours(weeklyPoints, targetTotalHours) {
  if (weeklyPoints.length === 0) return [];

  let running = 0;
  const cumulative = weeklyPoints.map((point) => {
    running += point.weeklyHours;
    return { date: point.date, hours: Math.round(running * 10) / 10 };
  });

  const lastHours = cumulative[cumulative.length - 1]?.hours || 0;
  if (targetTotalHours > 0 && lastHours > 0 && Math.abs(lastHours - targetTotalHours) > 5) {
    const scale = targetTotalHours / lastHours;
    return cumulative.map((point) => ({
      date: point.date,
      hours: Math.round(point.hours * scale),
    }));
  }

  if (targetTotalHours > 0 && cumulative.length > 0) {
    cumulative[cumulative.length - 1].hours = Math.round(targetTotalHours);
  }

  return cumulative;
}

async function extractFollowerHistory(page) {
  return page.evaluate(() => {
    const body = document.body.innerText;
    const followerMatch = body.match(/팔로워\s*\n?([\d,]+)명/);
    const currentFollowers = followerMatch
      ? parseInt(followerMatch[1].replace(/,/g, ""), 10)
      : 0;

    const path = Array.from(document.querySelectorAll("path")).find(
      (p) => (p.getAttribute("stroke") || "") === "#2656db"
    );
    const d = path?.getAttribute("d") || "";
    const coords = [];
    const re = /([ML])(-?[\d.]+),(-?[\d.]+)/g;
    let m;
    while ((m = re.exec(d))) coords.push({ x: +m[2], y: +m[3] });

    if (coords.length < 2 || currentFollowers <= 0) {
      return { currentFollowers, followers: [] };
    }

    const tickDates = [
      ...new Set(
        Array.from(document.querySelectorAll("text"))
          .map((t) => t.textContent?.trim() || "")
          .filter((t) => /^\d{2}\.\d{2}\.\d{2}$/.test(t))
      ),
    ]
      .map((label) => {
        const [yy, mm, dd] = label.split(".").map(Number);
        return new Date(2000 + yy, mm - 1, dd).getTime();
      })
      .sort((a, b) => a - b);

    const xMin = coords[0].x;
    const xMax = coords[coords.length - 1].x;
    const yBottom = Math.max(...coords.map((c) => c.y));
    const yTop = Math.min(...coords.map((c) => c.y));
    const ySpan = yBottom - yTop || 1;
    const startMs = tickDates[0] || Date.now() - 365 * 24 * 60 * 60 * 1000;
    const endMs = tickDates[tickDates.length - 1] || Date.now();
    const timeSpan = endMs - startMs || 1;

    const followers = [];
    for (let i = 0; i < coords.length; i++) {
      if (i % 2 !== 0 && i !== coords.length - 1) continue;
      const c = coords[i];
      const ratio = (c.x - xMin) / (xMax - xMin || 1);
      const ms = startMs + ratio * timeSpan;
      const value = Math.round(((yBottom - c.y) / ySpan) * currentFollowers);
      followers.push({
        date: new Date(ms).toISOString().slice(0, 10),
        followers: Math.max(0, value),
      });
    }

    if (followers.length > 0) {
      followers[followers.length - 1].followers = currentFollowers;
    }

    return { currentFollowers, followers };
  });
}

async function extractWeeklyHoursHistory(page) {
  return page.evaluate(() => {
    const rangeMatch = document.body.innerText.match(
      /(\d{2}\.\d{2}\.\d{2})\s*~\s*(\d{2}\.\d{2}\.\d{2})/
    );
    const rangeStart = rangeMatch ? rangeMatch[1] : null;
    const rangeEnd = rangeMatch ? rangeMatch[2] : null;

    const yLabels = Array.from(document.querySelectorAll("text"))
      .map((t) => t.textContent?.trim() || "")
      .filter((t) => /^\d+$/.test(t))
      .map(Number)
      .filter((n) => n >= 0 && n <= 500);
    const yMax = Math.max(...yLabels, 80);

    const bars = Array.from(document.querySelectorAll("rect"))
      .map((r) => ({
        h: Number(r.getAttribute("height") || 0),
        w: Number(r.getAttribute("width") || 0),
      }))
      .filter((r) => r.h > 10 && r.h < 260 && r.w > 20 && r.w < 50);

    if (bars.length === 0 || !rangeStart || !rangeEnd) {
      return { weeklyHours: [], rangeStart, rangeEnd };
    }

    const maxBarHeight = Math.max(...bars.map((b) => b.h), 1);
    const [sy, sm, sd] = rangeStart.split(".").map(Number);
    const [ey, em, ed] = rangeEnd.split(".").map(Number);
    const startMs = new Date(2000 + sy, sm - 1, sd).getTime();
    const endMs = new Date(2000 + ey, em - 1, ed).getTime();
    const span = endMs - startMs || 1;

    const weeklyHours = bars.map((bar, index) => {
      const ratio = bars.length === 1 ? 1 : index / (bars.length - 1);
      const ms = startMs + ratio * span;
      const weekly = Math.round(((bar.h / maxBarHeight) * yMax) * 10) / 10;
      return {
        date: new Date(ms).toISOString().slice(0, 10),
        weeklyHours: Math.max(0, weekly),
      };
    });

    return { weeklyHours, rangeStart, rangeEnd, barCount: bars.length };
  });
}

async function scrapeStreamer(page, streamer) {
  await page.goto(`${SOFTCON_BASE}/${streamer.channelId}?activityDate=all`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await page.waitForTimeout(2500);

  const followerHeading = page.getByText("팔로워 추이", { exact: true });
  await followerHeading.scrollIntoViewIfNeeded({ timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(1500);

  let followerResult = { currentFollowers: 0, followers: [] };
  try {
    await page.waitForFunction(
      () =>
        Array.from(document.querySelectorAll("path")).some(
          (p) => (p.getAttribute("stroke") || "") === "#2656db"
        ),
      { timeout: 15000 }
    );
    followerResult = await extractFollowerHistory(page);
  } catch {
    // flat follower line fallback
  }

  let hoursMeta = { weeklyHours: [], rangeStart: null, rangeEnd: null, barCount: 0 };
  try {
    await page.goto(`${SOFTCON_BASE}/${streamer.channelId}/statistics?period=week&range=all`, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    await page.waitForTimeout(2500);

    const hoursTab = page.getByRole("button", { name: /방송\s*시간/ });
    if (await hoursTab.count()) {
      await hoursTab.first().click({ timeout: 10000 });
    } else {
      await page.getByText(/방송\s*시간/).first().click({ timeout: 10000 });
    }
    await page.waitForTimeout(2000);
    hoursMeta = await extractWeeklyHoursHistory(page);
  } catch (hoursErr) {
    hoursMeta = { weeklyHours: [], rangeStart: null, rangeEnd: null, barCount: 0, error: hoursErr.message };
  }
  const range = parseRangeText(
    hoursMeta.rangeStart && hoursMeta.rangeEnd
      ? `${hoursMeta.rangeStart} ~ ${hoursMeta.rangeEnd}`
      : ""
  );

  let cumulativeHours = buildCumulativeHours(hoursMeta.weeklyHours, 0);

  const chzzkTotal = await page.evaluate(() => {
    const m = document.body.innerText.match(/방송 시간\s*([\d,.]+)\s*시간/);
    return m ? parseFloat(m[1].replace(/,/g, "")) : 0;
  });

  const targetHours = chzzkTotal > 0 ? chzzkTotal : streamer.totalLiveHours || 0;
  if (targetHours > 0) {
    cumulativeHours = buildCumulativeHours(hoursMeta.weeklyHours, targetHours);
  }

  return {
    followers: followerResult.followers,
    currentFollowers: followerResult.currentFollowers,
    weeklyHours: hoursMeta.weeklyHours,
    cumulativeHours,
    meta: {
      range: range
        ? `${range.start.toISOString().slice(0, 10)} ~ ${range.end.toISOString().slice(0, 10)}`
        : null,
      barCount: hoursMeta.barCount || 0,
      hoursError: hoursMeta.error || undefined,
      scrapedAt: new Date().toISOString(),
    },
  };
}

async function main() {
  const args = process.argv.slice(2);
  const missingOnly = args.includes("--missing-only");
  const onlyId = args.find((a) => a.startsWith("--id="))?.split("=")[1];

  const { FALLBACK_STREAMERS } = await import("../lib/streamersConfig.ts");
  const dataDir = join(__dirname, "../data");
  mkdirSync(dataDir, { recursive: true });
  const outPath = join(dataDir, "softcon-history.json");

  let output = {};
  try {
    output = JSON.parse(readFileSync(outPath, "utf8"));
  } catch {
    output = {};
  }

  let targets = FALLBACK_STREAMERS.map((s) => ({
    channelId: s.channelId,
    channelName: s.channelName,
    totalLiveHours: s.totalLiveHours,
  }));

  if (onlyId) {
    targets = targets.filter((s) => s.channelId === onlyId);
  } else if (missingOnly) {
    targets = targets.filter((s) => !hasHistory(output[s.channelId]));
  }

  if (targets.length === 0) {
    console.log("Nothing to scrape.");
    return;
  }

  console.log(`Scraping ${targets.length} streamer(s) → ${outPath}`);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

  for (const streamer of targets) {
    process.stdout.write(`${streamer.channelName}... `);
    try {
      const payload = await scrapeStreamer(page, streamer);
      output[streamer.channelId] = payload;
      writeFileSync(outPath, JSON.stringify(output, null, 2), "utf8");
      console.log(
        `followers ${payload.followers.length}, weeks ${payload.weeklyHours.length}, cumulative ${payload.cumulativeHours.length}`
      );
    } catch (err) {
      console.log(`FAILED (${err.message})`);
      output[streamer.channelId] = {
        followers: [],
        weeklyHours: [],
        cumulativeHours: [],
        meta: { error: err.message, scrapedAt: new Date().toISOString() },
      };
      writeFileSync(outPath, JSON.stringify(output, null, 2), "utf8");
    }
  }

  await browser.close();
  console.log(`\nDone. ${Object.keys(output).length} channels in ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
