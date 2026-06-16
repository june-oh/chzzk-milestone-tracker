import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const cfgText = fs.readFileSync(path.join(root, "lib/streamersConfig.ts"), "utf8");
const soft = JSON.parse(fs.readFileSync(path.join(root, "data/softcon-history.json"), "utf8"));

function buildCumulativeFromWeekly(weekly, targetTotal) {
  if (weekly.length === 0) return [];
  let sum = 0;
  const rawCumulative = weekly.map((week) => {
    sum += week.weeklyHours;
    return { date: week.date, hours: Math.round(sum) };
  });
  const target = targetTotal ?? rawCumulative.at(-1)?.hours ?? 0;
  const rawTotal = rawCumulative.at(-1)?.hours ?? 0;
  if (target <= 0 || rawTotal <= 0 || Math.abs(rawTotal - target) <= 5) {
    if (rawCumulative.length > 0) rawCumulative.at(-1).hours = target || rawTotal;
    return rawCumulative;
  }
  const scale = target / rawTotal;
  let cumulative = 0;
  return weekly.map((week, index) => {
    cumulative += week.weeklyHours * scale;
    const hours = index === weekly.length - 1 ? target : Math.round(cumulative);
    return { date: week.date, hours };
  });
}

function getManualCumulativeHoursHistory(channelId, targetTotal) {
  const entry = soft[channelId];
  if (!entry) return [];
  if (entry.weeklyHours?.length) return buildCumulativeFromWeekly(entry.weeklyHours, targetTotal);
  return entry.cumulativeHours || [];
}

function projectSeriesCrossing(history, target) {
  for (let i = 1; i < history.length; i++) {
    const prev = history[i - 1];
    const curr = history[i];
    if (prev.value <= target && curr.value >= target && curr.value > prev.value) {
      const ratio = (target - prev.value) / (curr.value - prev.value);
      const parseMs = (d) => (d.includes("T") ? new Date(d).getTime() : new Date(`${d}T12:00:00`).getTime());
      return new Date(parseMs(prev.date) + ratio * (parseMs(curr.date) - parseMs(prev.date))).toISOString();
    }
  }
  return null;
}

function getSoftconHoursMilestoneDate(channelId, milestoneHours, targetTotal) {
  const history = getManualCumulativeHoursHistory(channelId, targetTotal);
  if (!history.length) return null;
  return projectSeriesCrossing(history.map((p) => ({ date: p.date, value: p.hours })), milestoneHours);
}

function getSoftconHoursMilestoneDateBuggy(channelId, milestoneHours) {
  const entry = soft[channelId];
  const target = entry?.cumulativeHours?.at(-1)?.hours;
  return getSoftconHoursMilestoneDate(channelId, milestoneHours, target);
}

const streamers = [...cfgText.matchAll(
  /channelId: "([^"]+)", channelName: "([^"]+)"[\s\S]*?totalLiveHours: (\d+)[\s\S]*?followerCount: (\d+)/g
)].map((m) => ({ id: m[1], name: m[2], totalLiveHours: Number(m[3]), followerCount: Number(m[4]) }));

for (const s of streamers) {
  const entry = soft[s.id];
  if (!entry?.weeklyHours?.length && !entry?.cumulativeHours?.length && !entry?.followers?.length) continue;

  const milestoneCount = Math.floor(s.totalLiveHours / 1000);
  const hasHours = entry.weeklyHours?.length || entry.cumulativeHours?.length;
  const hasFollowers = entry.followers?.length;

  let hoursFound = 0;
  let hoursFoundBuggy = 0;
  for (let m = 1; m <= milestoneCount; m++) {
    const val = m * 1000;
    if (getSoftconHoursMilestoneDate(s.id, val, s.totalLiveHours)) hoursFound++;
    if (getSoftconHoursMilestoneDateBuggy(s.id, val)) hoursFoundBuggy++;
  }

  const followerCount = s.followerCount;
  const followerMilestones = Math.floor(followerCount / 10000);
  let followersFound = 0;
  for (let m = 1; m <= followerMilestones; m++) {
    const val = m * 10000;
    const history = entry.followers || [];
    const date = projectSeriesCrossing(history.map((p) => ({ date: p.date, value: p.followers })), val);
    if (date) followersFound++;
  }

  const currentLogicHours = hoursFound;
  const currentLogicFollowers = followersFound;
  const wouldShowEmpty = currentLogicHours === 0 && currentLogicFollowers === 0 && (milestoneCount > 0 || followerMilestones > 0);

  if (wouldShowEmpty || hoursFound < milestoneCount || hoursFoundBuggy !== hoursFound) {
    console.log(JSON.stringify({
      name: s.name,
      totalLiveHours: s.totalLiveHours,
      milestoneCount,
      hoursFound,
      hoursFoundBuggy,
      followerMilestones,
      followersFound,
      wouldShowEmpty,
      wouldShowEmptyBuggy: hoursFoundBuggy === 0 && followersFound === 0 && (milestoneCount > 0 || followerMilestones > 0),
      hasWeekly: Boolean(entry.weeklyHours?.length),
      cumLast: entry.cumulativeHours?.at(-1)?.hours,
    }));
  }
}
