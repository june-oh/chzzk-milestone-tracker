/**
 * Extract profile-image theme palettes and save for streamers without verified namu.wiki colors.
 * Usage: npx tsx scripts/build-image-theme-colors.mjs [--write]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { FALLBACK_STREAMERS } from "../lib/streamersConfig.ts";
import { extractPaletteFromImageUrl } from "../lib/imagePalette.ts";
import themeColorsJson from "../data/namuwiki-theme-colors.json" with { type: "json" };

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_PATH = path.join(__dirname, "../data/image-theme-colors.json");

function isVerifiedNamuwiki(channelId) {
  const entry = themeColorsJson.colors[channelId];
  return Boolean(entry?.hex && entry.estimated === false);
}

async function main() {
  const write = process.argv.includes("--write");
  const colors = {};

  for (const streamer of FALLBACK_STREAMERS) {
    const skipNamuwiki = isVerifiedNamuwiki(streamer.channelId);
    process.stdout.write(`${streamer.channelName}... `);

    try {
      const palette = await extractPaletteFromImageUrl(streamer.channelImageUrl);
      if (!palette) {
        console.log("FAIL");
        continue;
      }
      colors[streamer.channelId] = {
        channelName: streamer.channelName,
        cardBg: palette.cardBg,
        cardBorder: palette.cardBorder,
        accentHex: palette.accentHex,
        accentRgb: palette.accentRgb,
        usedWhenNamuwikiMissing: !skipNamuwiki,
      };
      console.log(palette.accentHex, skipNamuwiki ? "(namuwiki verified)" : "");
    } catch (err) {
      console.log("error", err.message);
    }
  }

  const payload = {
    meta: {
      updatedAt: new Date().toISOString(),
      count: Object.keys(colors).length,
      total: FALLBACK_STREAMERS.length,
      algorithm: "sharp dominant-color + saturation boost",
    },
    colors,
  };

  if (write) {
    fs.writeFileSync(OUT_PATH, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
    console.log(`\nWrote ${OUT_PATH}`);
  } else {
    console.log(JSON.stringify(payload, null, 2));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
