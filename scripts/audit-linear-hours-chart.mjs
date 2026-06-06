import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const cfgText = fs.readFileSync(path.join(root, "lib/streamersConfig.ts"), "utf8");
const soft = JSON.parse(fs.readFileSync(path.join(root, "data/softcon-history.json"), "utf8"));
const profiles = JSON.parse(fs.readFileSync(path.join(root, "data/namuwiki-profiles.json"), "utf8")).profiles;

const PLANETA_DEBUT = {
  "941ea3807ba8b9b7dddb1670e3e7e5af": "2026-05-30",
  "5ead7124638ac4c568f2cde0224b3b6b": "2026-05-30",
  "59aa824e4c4a56dd51e7a5e2e9172648": "2026-05-31",
  "d5e2e0c14dcca4c4b10c7c9633022f52": "2026-05-31",
};

const GROUP_DEBUT = {
  AESTHER: "2024-02-07",
  Honeyz: "2024-02-07",
  StelLive: "2024-02-07",
  CLUEZ: "2025-11-29",
  ACAXIA: "2025-09-13",
  Listella: "2024-09-15",
};

const GROUP_TAGS = {
  "a3ceb9179d99be8d1e63b3e911fcd16b": "CLUEZ",
  "088973112d8acc831ec20274f7ffbb99": "CLUEZ",
  "65c3035bdc598c81f15a8fe0e958b3ce": "ENCHANT",
  "32fb866e323242b770cdc790f991a6f6": "AESTHER",
  "4de764d9dad3b25602284be6db3ac647": "AESTHER",
  "17d8605fc37fb5ef49f5f67ae786fe4e": "AESTHER",
  "475313e6c26639d5763628313b4c130e": "AESTHER",
};

function debutFor(id, firstLiveDate) {
  if (profiles[id]?.source?.startsWith("manual") && profiles[id]?.debutDate) return profiles[id].debutDate;
  if (PLANETA_DEBUT[id]) return PLANETA_DEBUT[id];
  const g = GROUP_TAGS[id];
  if (g && GROUP_DEBUT[g]) return GROUP_DEBUT[g];
  if (profiles[id]?.debutDate) return profiles[id].debutDate;
  const trimmed = (firstLiveDate || "").trim();
  return trimmed.slice(0, 10) || null;
}

function dayGap(a, b) {
  const [y1, m1, d1] = a.split("-").map(Number);
  const [y2, m2, d2] = b.split("-").map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000);
}

const streamers = [...cfgText.matchAll(/channelId: "([^"]+)", channelName: "([^"]+)"[\s\S]*?firstLiveDate: "([^"]*)"/g)].map(
  (m) => ({ id: m[1], name: m[2], firstLiveDate: m[3] })
);

const issues = [];

for (const s of streamers) {
  const entry = soft[s.id];
  const debut = debutFor(s.id, s.firstLiveDate);
  const cum = entry?.cumulativeHours || [];
  const barCount = entry?.meta?.barCount ?? entry?.weeklyHours?.length ?? 0;

  if (cum.length === 0 && !s.firstLiveDate) {
    issues.push({ name: s.name, reason: "방송 시작일 없음 + 시간 이력 없음", debut, points: 0 });
    continue;
  }

  if (cum.length <= 3 || barCount <= 3) {
    const first = cum[0]?.date;
    const last = cum[cum.length - 1]?.date;
    const span = first && last ? dayGap(first, last) : 0;
    const beforeDebut = debut && first && first < debut;
    if (beforeDebut || span > 60 || cum.length <= 2) {
      issues.push({
        name: s.name,
        reason: beforeDebut ? "이력 시작일이 데뷔일보다 이름" : "데이터 포인트가 너무 적음",
        debut,
        firstLiveDate: s.firstLiveDate || "(없음)",
        first,
        last,
        spanDays: span,
        points: cum.length,
        barCount,
      });
    }
  }
}

console.log(`의심 케이스 ${issues.length}명\n`);
for (const row of issues) {
  console.log(`- ${row.name}: ${row.reason}`);
  console.log(`  데뷔 ${row.debut ?? "?"} · firstLive ${row.firstLiveDate}`);
  if (row.first) console.log(`  softcon ${row.first} → ${row.last} (${row.spanDays}일, ${row.points}점)`);
}
