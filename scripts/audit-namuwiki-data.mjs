import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const cfgText = fs.readFileSync(path.join(root, "lib/streamersConfig.ts"), "utf8");
const prof = JSON.parse(fs.readFileSync(path.join(root, "data/namuwiki-profiles.json"), "utf8")).profiles;

const streamers = [...cfgText.matchAll(/channelId: "([^"]+)", channelName: "([^"]+)"/g)].map((m) => ({
  id: m[1],
  name: m[2],
}));

const noProfile = [];
const noBirthday = [];
const noNamuDebut = [];

for (const { id, name } of streamers) {
  const p = prof[id];
  if (!p) {
    noProfile.push(name);
    noBirthday.push(name);
    noNamuDebut.push(name);
    continue;
  }
  if (!p.birthday) noBirthday.push(name);
  if (!p.debutDate) noNamuDebut.push(name);
}

console.log(`Total streamers: ${streamers.length}`);
console.log(`\n=== 나무위키 문서 없음 (${noProfile.length}) ===`);
console.log(noProfile.join(", ") || "(없음)");
console.log(`\n=== 생일 없음 (${noBirthday.length}) ===`);
console.log(noBirthday.join(", ") || "(없음)");
console.log(`\n=== 나무위키 데뷔일 없음 (${noNamuDebut.length}) ===`);
console.log(noNamuDebut.join(", ") || "(없음)");
