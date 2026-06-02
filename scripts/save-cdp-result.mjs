#!/usr/bin/env node
/** Write CDP JSON string from argv to data/cdp-{name}-{kind}.json */
import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const [, , name, kind, jsonStr] = process.argv;
if (!name || !kind || !jsonStr) {
  console.error("Usage: node save-cdp-result.mjs <name> <followers|hours> '<json>'");
  process.exit(1);
}
const out = join(__dirname, "..", "data", `cdp-${name}-${kind}.json`);
writeFileSync(out, JSON.stringify(JSON.parse(jsonStr), null, 2) + "\n", "utf8");
console.log(out);
