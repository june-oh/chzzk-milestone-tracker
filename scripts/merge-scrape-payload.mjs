#!/usr/bin/env node
/** Merge followers JSON + hours JSON into one scrape file and append to softcon-history.json */
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const [channelId, name, followersPath, hoursPath] = process.argv.slice(2);
if (!channelId || !name || !followersPath) {
  console.error(
    "Usage: node merge-scrape-payload.mjs <channelId> <name> <followers.json> [hours.json]"
  );
  process.exit(1);
}
const followers = JSON.parse(readFileSync(followersPath, "utf8"));
const hours = hoursPath
  ? JSON.parse(readFileSync(hoursPath, "utf8"))
  : { weeklyHours: [], cumulativeHours: [], meta: {} };
const payload = {
  currentFollowers: followers.currentFollowers,
  followers: followers.followers || [],
  weeklyHours: hours.weeklyHours || [],
  cumulativeHours: hours.cumulativeHours || [],
  meta: hours.meta || {},
};
const out = join(__dirname, "..", "data", `scrape-${name}.json`);
writeFileSync(out, JSON.stringify(payload, null, 2) + "\n", "utf8");
const r = spawnSync(
  process.execPath,
  [join(__dirname, "append-softcon-channel.mjs"), channelId, out],
  { stdio: "inherit" }
);
process.exit(r.status ?? 1);
