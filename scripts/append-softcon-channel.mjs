#!/usr/bin/env node
/** Merge one channel scrape into data/archived-history.json (never clobber manual data). */
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { mergeSoftconChannel } from "./softcon-merge-utils.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataPath = join(__dirname, "..", "data", "archived-history.json");
const channelId = process.argv[2];
const payloadPath = process.argv[3];
const force = process.argv.includes("--force");

if (!channelId || !payloadPath) {
  console.error("Usage: node append-softcon-channel.mjs <channelId> <payload.json> [--force]");
  process.exit(1);
}

const incoming = JSON.parse(readFileSync(payloadPath, "utf8"));
if (!incoming.meta) incoming.meta = {};
if (!incoming.meta.source) incoming.meta.source = "browser-cdp";

let db = {};
try {
  db = JSON.parse(readFileSync(dataPath, "utf8"));
} catch {
  db = {};
}

const { entry, action } = mergeSoftconChannel(db[channelId], incoming, {
  source: incoming.meta.source,
  force,
});

db[channelId] = entry;
writeFileSync(dataPath, JSON.stringify(db, null, 2) + "\n", "utf8");
console.log(`${action}: ${channelId} (${Object.keys(db).length} channels)`);
