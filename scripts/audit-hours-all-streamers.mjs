/**
 * Audit hours milestones / archive vs debut for all tracked streamers.
 * Usage: node scripts/audit-hours-all-streamers.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const cfgText = fs.readFileSync(path.join(root, "lib/streamersConfig.ts"), "utf8");
const soft = JSON.parse(fs.readFileSync(path.join(root, "data/archived-history.json"), "utf8"));

const metaText = fs.readFileSync(path.join(root, "lib/streamerMeta.ts"), "utf8");

const groupTags = {};
for (const m of metaText.matchAll(/"([a-f0-9]{32})": "([^"]+)", \/\/ /g)) {
  groupTags[m[1]] = m[2];
}

const channelDebuts = {};
for (const m of metaText.matchAll(/"([a-f0-9]{32})": "(\d{4}-\d{2}-\d{2})", \/\/ /g)) {
  channelDebuts[m[1]] = m[2];
}

const groupDebuts = {};
const groupDebutBlock = metaText.match(/GROUP_DEBUT_DATES[\s\S]*?\};/s)?.[0] ?? "";
for (const m of groupDebutBlock.matchAll(/(\w+): "(\d{4}-\d{2}-\d{2})"/g)) {
  groupDebuts[m[1]] = m[2];
}

const listellaGroupDebutIds = new Set(
  [...(metaText.match(/LISTELLA_GROUP_DEBUT_IDS = new Set\(\[([\s\S]*?)\]\)/)?.[1] ?? "").matchAll(
    /"([a-f0-9]{32})"/g
  )].map((m) => m[1])
);

function getDebutReferenceDate(channelId, firstLiveDate) {
  if (channelDebuts[channelId]) return channelDebuts[channelId];
  const group = groupTags[channelId];
  if (group && groupDebuts[group]) {
    if (group === "Listella" && !listellaGroupDebutIds.has(channelId)) {
      return firstLiveDate?.slice(0, 10);
    }
    return groupDebuts[group];
  }
  return firstLiveDate?.slice(0, 10);
}

function parseMs(d) {
  const match = String(d).trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return NaN;
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function dayDiff(debut, target) {
  return Math.round((parseMs(target) - parseMs(debut)) / 86400000);
}

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

function getCumulative(channelId, targetTotal, debutDate) {
  const entry = soft[channelId];
  if (!entry) return [];
  let weekly = entry.weeklyHours;
  if (weekly?.length) {
    if (debutDate) {
      const debutMs = parseMs(debutDate);
      if (Number.isFinite(debutMs) && parseMs(weekly[0].date) < debutMs) {
        weekly = weekly.filter((w) => parseMs(w.date) >= debutMs);
      }
    }
    if (weekly.length) return buildCumulativeFromWeekly(weekly, targetTotal);
  }
  let fromJson = entry.cumulativeHours;
  if (fromJson?.length && debutDate) {
    const debutMs = parseMs(debutDate);
    if (Number.isFinite(debutMs)) {
      fromJson = fromJson.filter((p) => parseMs(p.date) >= debutMs);
    }
  }
  return fromJson || [];
}

function sanitizeHours(points, debutDate, targetTotal) {
  if (!points.length || !debutDate) return points;
  const debutMs = parseMs(debutDate);
  if (!Number.isFinite(debutMs)) return points;
  const debutDay = debutDate.slice(0, 10);
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date));
  const beforeDebut = sorted.filter((p) => parseMs(p.date) < debutMs);
  const baseline = beforeDebut.length ? beforeDebut.at(-1).hours : 0;
  const onOrAfterDebut = sorted.filter((p) => parseMs(p.date) >= debutMs);
  const result = [{ date: debutDay, hours: 0 }];
  for (const point of onOrAfterDebut) {
    const dateKey = point.date.slice(0, 10);
    const rebased = Math.max(0, Math.round(point.hours - baseline));
    if (parseMs(dateKey) === debutMs && rebased <= 0) continue;
    result.push({ date: dateKey, hours: rebased });
  }
  if (result.length === 1 && targetTotal > 0) {
    result.push({ date: new Date().toISOString().slice(0, 10), hours: Math.round(targetTotal) });
  }
  if (targetTotal !== undefined && result.length > 0) {
    result.at(-1).hours = Math.round(targetTotal);
  }
  return result;
}

function projectCrossing(history, target) {
  for (let i = 1; i < history.length; i++) {
    const prev = history[i - 1];
    const curr = history[i];
    if (prev.hours <= target && curr.hours >= target && curr.hours > prev.hours) {
      const ratio = (target - prev.hours) / (curr.hours - prev.hours);
      const ms = parseMs(prev.date) + ratio * (parseMs(curr.date) - parseMs(prev.date));
      return new Date(ms).toISOString();
    }
  }
  return null;
}

const streamers = [...cfgText.matchAll(
  /channelId: "([^"]+)", channelName: "([^"]+)"[\s\S]*?firstLiveDate: "([^"]*)"[\s\S]*?totalLiveHours: (\d+)/g
)].map((m) => ({
  id: m[1],
  name: m[2],
  firstLiveDate: m[3],
  totalLiveHours: Number(m[4]),
}));

const issues = [];

for (const s of streamers) {
  const entry = soft[s.id];
  if (!entry?.weeklyHours?.length && !entry?.cumulativeHours?.length) continue;

  const debut = getDebutReferenceDate(s.id, s.firstLiveDate);
  if (!debut) continue;

  const firstWeekly = entry.weeklyHours?.[0]?.date;
  const preDebutWeekly = entry.weeklyHours?.some((w) => parseMs(w.date) < parseMs(debut));

  const raw = getCumulative(s.id, s.totalLiveHours, debut);
  const chart = sanitizeHours(raw, debut, s.totalLiveHours);

  const m1000 = projectCrossing(chart, 1000);
  const daysTo1000 = m1000 ? dayDiff(debut, m1000) : null;

  const firstAfterDebut = chart.find((p) => parseMs(p.date) >= parseMs(debut) && p.hours > 0);

  const minDaysFor1000 = Math.ceil(1000 / 24); // 42 days physical minimum
  const suspicious =
    (daysTo1000 !== null && daysTo1000 < minDaysFor1000) ||
    (firstAfterDebut && firstAfterDebut.hours > 500 && dayDiff(debut, firstAfterDebut.date) < 14);

  if (s.totalLiveHours >= 1000 || suspicious || preDebutWeekly) {
    issues.push({
      name: s.name,
      debut,
      totalLiveHours: s.totalLiveHours,
      firstWeekly,
      preDebutWeekly,
      firstAfterDebutHours: firstAfterDebut?.hours,
      firstAfterDebutDate: firstAfterDebut?.date,
      daysTo1000,
      suspicious: daysTo1000 !== null && daysTo1000 < minDaysFor1000,
    });
  }
}

issues.sort((a, b) => (a.daysTo1000 ?? 9999) - (b.daysTo1000 ?? 9999));

console.log("=== Hours audit (suspicious / 1000h+ streamers) ===\n");
for (const row of issues) {
  const flag = row.suspicious ? " ⚠️ IMPOSSIBLE" : row.preDebutWeekly ? " ℹ️ pre-debut weekly (rebased)" : "";
  console.log(
    `${row.name}${flag}\n` +
      `  debut=${row.debut} total=${row.totalLiveHours}h firstWeekly=${row.firstWeekly} preDebutWeekly=${row.preDebutWeekly}\n` +
      `  1st post-debut point: ${row.firstAfterDebutDate} = ${row.firstAfterDebutHours}h\n` +
      `  1000h milestone: ${row.daysTo1000 ?? "n/a"}d\n`
  );
}

console.log(`Total flagged with impossible 1000h: ${issues.filter((i) => i.suspicious).length}`);
