import sharp from "sharp";
import { toGlassSurfacePalette } from "./cardPaletteUtils";

export type CardPalette = {
  cardBg: string;
  cardBorder: string;
  accentHex: string;
  accentRgb: string;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b].map((value) => clamp(Math.round(value), 0, 255).toString(16).padStart(2, "0")).join("")}`;
}

function boostSaturation(rgb: { r: number; g: number; b: number }, factor = 1.55) {
  const avg = (rgb.r + rgb.g + rgb.b) / 3;
  return {
    r: clamp(Math.round(avg + (rgb.r - avg) * factor), 0, 255),
    g: clamp(Math.round(avg + (rgb.g - avg) * factor), 0, 255),
    b: clamp(Math.round(avg + (rgb.b - avg) * factor), 0, 255),
  };
}

/** Glass-friendly rgba surfaces derived from profile image dominant color. */
export function buildCardPalette(rgb: { r: number; g: number; b: number }): CardPalette {
  const { r, g, b } = boostSaturation(rgb);

  const accentR = clamp(Math.round(r * 0.82), 0, 255);
  const accentG = clamp(Math.round(g * 0.82), 0, 255);
  const accentB = clamp(Math.round(b * 0.82), 0, 255);

  return {
    cardBg: `rgba(${r}, ${g}, ${b}, 0.16)`,
    cardBorder: `rgba(${r}, ${g}, ${b}, 0.38)`,
    accentHex: rgbToHex(accentR, accentG, accentB),
    accentRgb: `${r}, ${g}, ${b}`,
  };
}

export { toGlassSurfacePalette } from "./cardPaletteUtils";

export function extractDominantRgb(pixels: Buffer, channels: number) {
  let rSum = 0;
  let gSum = 0;
  let bSum = 0;
  let count = 0;

  for (let i = 0; i < pixels.length; i += channels) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const saturation = max === 0 ? 0 : (max - min) / max;
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

    if (saturation < 0.1 || luminance > 0.93 || luminance < 0.07) {
      continue;
    }

    rSum += r;
    gSum += g;
    bSum += b;
    count += 1;
  }

  if (count === 0) {
    for (let i = 0; i < pixels.length; i += channels) {
      rSum += pixels[i];
      gSum += pixels[i + 1];
      bSum += pixels[i + 2];
      count += 1;
    }
  }

  return {
    r: Math.round(rSum / count),
    g: Math.round(gSum / count),
    b: Math.round(bSum / count),
  };
}

export async function extractPaletteFromImageUrl(imageUrl: string): Promise<CardPalette | null> {
  if (!imageUrl) return null;

  try {
    const response = await fetch(imageUrl, { cache: "no-store" });
    if (!response.ok) return null;

    const buffer = Buffer.from(await response.arrayBuffer());
    const { data, info } = await sharp(buffer)
      .resize(48, 48, { fit: "cover", position: "centre" })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const dominant = extractDominantRgb(data, info.channels);
    return buildCardPalette(dominant);
  } catch (err) {
    console.warn("Failed to extract palette from image:", imageUrl, err);
    return null;
  }
}

export async function attachPaletteToStreamer<T extends { channelImageUrl: string }>(
  streamer: T
): Promise<T & Partial<CardPalette>> {
  const palette = await extractPaletteFromImageUrl(streamer.channelImageUrl);
  if (!palette) return streamer;
  return { ...streamer, ...palette };
}

function hasCachedPalette(streamer: { cardBg?: string; cardBorder?: string }) {
  return Boolean(streamer.cardBg && streamer.cardBorder);
}

const PALETTE_BATCH_SIZE = 6;

export async function ensureStreamerPalettes<
  T extends { channelId: string; channelImageUrl: string; cardBg?: string; cardBorder?: string },
>(streamers: T[]): Promise<Array<T & Partial<CardPalette>>> {
  const missing = streamers.filter((s) => !hasCachedPalette(s));
  if (missing.length === 0) {
    return streamers.map((s) =>
      hasCachedPalette(s)
        ? { ...s, ...toGlassSurfacePalette({ cardBg: s.cardBg!, cardBorder: s.cardBorder! }) }
        : s
    );
  }

  const paletteById = new Map<string, Partial<CardPalette>>();

  for (let i = 0; i < missing.length; i += PALETTE_BATCH_SIZE) {
    const batch = missing.slice(i, i + PALETTE_BATCH_SIZE);
    const results = await Promise.all(batch.map((s) => attachPaletteToStreamer(s)));
    results.forEach((r) => paletteById.set(r.channelId, r));
  }

  return streamers.map((s) => {
    const extracted = paletteById.get(s.channelId);
    if (extracted) return { ...s, ...extracted };
    if (hasCachedPalette(s)) {
      return { ...s, ...toGlassSurfacePalette({ cardBg: s.cardBg!, cardBorder: s.cardBorder! }) };
    }
    return s;
  });
}
