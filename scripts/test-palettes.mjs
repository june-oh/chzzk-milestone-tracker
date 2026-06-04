import { FALLBACK_STREAMERS } from "../lib/streamersConfig.ts";

const base = process.argv[2] || "https://chzzk-milestone-tracker.vercel.app";

for (const s of FALLBACK_STREAMERS.slice(0, 25)) {
  const url = `${base}/api/image-palette?url=${encodeURIComponent(s.channelImageUrl)}`;
  const res = await fetch(url);
  const data = await res.json();
  const rgb = data.accentRgb || "FAIL";
  const [r, g, b] = rgb.split(",").map(Number);
  const spread = Number.isFinite(r) ? Math.max(r, g, b) - Math.min(r, g, b) : 0;
  console.log(String(spread).padStart(3), rgb.padEnd(18), s.channelName);
}
