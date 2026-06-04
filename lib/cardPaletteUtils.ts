import type { CSSProperties } from "react";

export type CardSurfacePalette = {
  cardBg: string;
  cardBorder: string;
  accentHex?: string;
  accentRgb?: string;
};

const RGB_PATTERN = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b].map((value) => clamp(Math.round(value), 0, 255).toString(16).padStart(2, "0")).join("")}`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = hex.replace("#", "").trim();
  if (normalized.length === 3) {
    const r = parseInt(normalized[0] + normalized[0], 16);
    const g = parseInt(normalized[1] + normalized[1], 16);
    const b = parseInt(normalized[2] + normalized[2], 16);
    return { r, g, b };
  }
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return { r, g, b };
}

export function paletteAccentSpread(accentRgb: string) {
  const parts = accentRgb.split(",").map((value) => Number(value.trim()));
  if (parts.length !== 3 || parts.some((value) => !Number.isFinite(value))) return 0;
  return Math.max(...parts) - Math.min(...parts);
}

/** Skin-tone / gray KV caches from early cron runs read as "no theme found". */
export function isMutedPalette(palette: Pick<CardSurfacePalette, "cardBg" | "accentRgb">) {
  const accentRgb =
    palette.accentRgb ??
    palette.cardBg.match(RGB_PATTERN)?.slice(1, 4).map((value) => value.trim()).join(", ");
  if (!accentRgb) return true;
  return paletteAccentSpread(accentRgb) < 45;
}

export function paletteFromHex(hex: string): CardSurfacePalette {
  const { r, g, b } = hexToRgb(hex);
  return {
    cardBg: `rgba(${r}, ${g}, ${b}, 0.32)`,
    cardBorder: `rgba(${r}, ${g}, ${b}, 0.38)`,
    accentHex: rgbToHex(r, g, b),
    accentRgb: `${r}, ${g}, ${b}`,
  };
}

/** Upgrade legacy opaque rgb() values to glass rgba for display (no image fetch). */
export function toGlassSurfacePalette(palette: Pick<CardSurfacePalette, "cardBg" | "cardBorder">): CardSurfacePalette {
  if (palette.cardBg.startsWith("rgba(")) {
    const match = palette.cardBg.match(RGB_PATTERN);
    const accentRgb = match ? `${match[1]}, ${match[2]}, ${match[3]}` : "120, 120, 120";
    return {
      ...palette,
      accentHex: match ? rgbToHex(Number(match[1]), Number(match[2]), Number(match[3])) : "#787878",
      accentRgb,
    };
  }

  const match = palette.cardBg.match(RGB_PATTERN);
  if (!match) {
    return paletteFromHex("#94a3b8");
  }

  const r = Number(match[1]);
  const g = Number(match[2]);
  const b = Number(match[3]);
  return {
    cardBg: `rgba(${r}, ${g}, ${b}, 0.32)`,
    cardBorder: `rgba(${r}, ${g}, ${b}, 0.38)`,
    accentHex: rgbToHex(r, g, b),
    accentRgb: `${r}, ${g}, ${b}`,
  };
}

export function resolveCardPalette(options: {
  cardBg?: string;
  cardBorder?: string;
  extracted?: CardSurfacePalette | null;
  fallbackHex?: string;
}): CardSurfacePalette {
  if (options.extracted?.cardBg && options.extracted?.cardBorder) {
    return toGlassSurfacePalette(options.extracted);
  }

  if (options.cardBg && options.cardBorder) {
    const kvPalette = toGlassSurfacePalette({ cardBg: options.cardBg, cardBorder: options.cardBorder });
    if (!isMutedPalette(kvPalette)) {
      return kvPalette;
    }
  }

  return paletteFromHex(options.fallbackHex ?? "#94a3b8");
}

/** CSS styles for frosted-glass profile cards (needs colorful backdrop behind). */
export function getGlassCardStyle(palette: CardSurfacePalette): CSSProperties {
  const rgb = palette.accentRgb ?? "148, 163, 184";
  return {
    background: `linear-gradient(150deg, rgba(${rgb}, 0.44) 0%, rgba(${rgb}, 0.18) 38%, rgba(255,255,255,0.42) 100%)`,
    borderColor: palette.cardBorder,
    boxShadow: `0 10px 32px rgba(${rgb}, 0.18), inset 0 1px 0 rgba(255,255,255,0.75), inset 0 -1px 0 rgba(${rgb}, 0.12)`,
  };
}
