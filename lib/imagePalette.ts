import sharp from "sharp";

export type CardPalette = {
  cardBg: string;
  cardBorder: string;
  accentHex: string;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function mixWithWhite(channel: number, weight: number) {
  return Math.round(channel * weight + 255 * (1 - weight));
}

function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b].map((value) => clamp(Math.round(value), 0, 255).toString(16).padStart(2, "0")).join("")}`;
}

export function buildCardPalette(rgb: { r: number; g: number; b: number }): CardPalette {
  const { r, g, b } = rgb;

  const cardBg = `rgb(${mixWithWhite(r, 0.42)}, ${mixWithWhite(g, 0.42)}, ${mixWithWhite(b, 0.42)})`;
  const cardBorder = `rgb(${mixWithWhite(r, 0.58)}, ${mixWithWhite(g, 0.58)}, ${mixWithWhite(b, 0.58)})`;

  const accentR = clamp(Math.round(r * 0.82), 0, 255);
  const accentG = clamp(Math.round(g * 0.82), 0, 255);
  const accentB = clamp(Math.round(b * 0.82), 0, 255);

  return {
    cardBg,
    cardBorder,
    accentHex: rgbToHex(accentR, accentG, accentB),
  };
}

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

export async function ensureStreamerPalettes<T extends { channelImageUrl: string; cardBg?: string }>(
  streamers: T[]
): Promise<Array<T & Partial<CardPalette>>> {
  return Promise.all(
    streamers.map(async (streamer) => {
      if (streamer.cardBg) return streamer;
      return attachPaletteToStreamer(streamer);
    })
  );
}
