#!/usr/bin/env node
/** Merge one channel scrape into data/softcon-history.json */
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataPath = join(__dirname, "..", "data", "softcon-history.json");
const channelId = process.argv[2];
const payloadPath = process.argv[3];
if (!channelId || !payloadPath) {
  console.error("Usage: node append-softcon-channel.mjs <channelId> <payload.json>");
  process.exit(1);
}
const payload = JSON.parse(readFileSync(payloadPath, "utf8"));
let db = {};
try {
  db = JSON.parse(readFileSync(dataPath, "utf8"));
} catch {
  db = {};
}
db[channelId] = payload;
writeFileSync(dataPath, JSON.stringify(db, null, 2) + "\n", "utf8");
console.log(`Updated ${channelId} (${Object.keys(db).length} channels)`);
