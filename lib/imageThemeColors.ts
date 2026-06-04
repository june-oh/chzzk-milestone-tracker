import imageThemeJson from "@/data/image-theme-colors.json";
import { toGlassSurfacePalette, type CardSurfacePalette } from "./cardPaletteUtils";

export type ImageThemeEntry = {
  channelName: string;
  cardBg: string;
  cardBorder: string;
  accentHex: string;
  accentRgb: string;
  usedWhenNamuwikiMissing?: boolean;
};

type ImageThemeFile = {
  meta: {
    updatedAt: string;
    count: number;
    total: number;
    algorithm: string;
  };
  colors: Record<string, ImageThemeEntry>;
};

const imageData = imageThemeJson as ImageThemeFile;

export function getImageThemeEntry(channelId: string): ImageThemeEntry | null {
  return imageData.colors[channelId] ?? null;
}

export function getBundledImageThemePalette(channelId: string): CardSurfacePalette | null {
  const entry = getImageThemeEntry(channelId);
  if (!entry?.cardBg || !entry.cardBorder) return null;
  const glass = toGlassSurfacePalette({ cardBg: entry.cardBg, cardBorder: entry.cardBorder });
  return {
    ...glass,
    accentHex: entry.accentHex ?? glass.accentHex,
    accentRgb: entry.accentRgb ?? glass.accentRgb,
  };
}

export function getImageThemeMeta() {
  return imageData.meta;
}
