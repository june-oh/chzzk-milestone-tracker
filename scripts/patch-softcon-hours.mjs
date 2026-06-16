#!/usr/bin/env node
/** Patch one channel's hours in archived-history.json from git HEAD + hours payload */
import { execSync } from "child_process";
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const [channelId, hoursPath] = process.argv.slice(2);
if (!channelId || !hoursPath) {
  console.error("Usage: node patch-softcon-hours.mjs <channelId> <hours.json>");
  process.exit(1);
}

const hoursPayload = JSON.parse(readFileSync(hoursPath, "utf8"));
const db = JSON.parse(
  execSync("git show HEAD:data/archived-history.json", { encoding: "utf8" })
);

if (!db[channelId]) {
  console.error(`Channel ${channelId} not in archived-history.json`);
  process.exit(1);
}

db[channelId] = {
  ...db[channelId],
  weeklyHours: hoursPayload.weeklyHours,
  cumulativeHours: hoursPayload.cumulativeHours,
  meta: { ...(db[channelId].meta || {}), ...(hoursPayload.meta || {}) },
};

writeFileSync(
  join(__dirname, "..", "data", "archived-history.json"),
  JSON.stringify(db, null, 2) + "\n",
  "utf8"
);
console.log(`Patched ${channelId}: ${hoursPayload.weeklyHours?.length} weekly bars`);
