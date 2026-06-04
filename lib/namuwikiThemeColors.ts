import themeColorsJson from "@/data/namuwiki-theme-colors.json";
import { paletteFromHex, type CardSurfacePalette } from "./cardPaletteUtils";

export type NamuwikiThemeEntry = {
  channelName: string;
  hex: string;
  colorName: string;
  source: string;
  estimated: boolean;
};

type NamuwikiThemeFile = {
  meta: {
    updatedAt: string;
    count: number;
    total: number;
    source: string;
  };
  colors: Record<string, NamuwikiThemeEntry>;
};

const themeData = themeColorsJson as NamuwikiThemeFile;

export function getNamuwikiThemeEntry(channelId: string): NamuwikiThemeEntry | null {
  return themeData.colors[channelId] ?? null;
}

export function getNamuwikiThemePalette(channelId: string): CardSurfacePalette | null {
  const entry = getNamuwikiThemeEntry(channelId);
  if (!entry?.hex) return null;
  return paletteFromHex(entry.hex);
}

/** Only namu.wiki infobox colors confirmed on wiki (not Perplexity estimates). */
export function getVerifiedNamuwikiThemePalette(channelId: string): CardSurfacePalette | null {
  const entry = getNamuwikiThemeEntry(channelId);
  if (!entry?.hex || entry.estimated) return null;
  return paletteFromHex(entry.hex);
}

export function hasVerifiedNamuwikiTheme(channelId: string) {
  const entry = getNamuwikiThemeEntry(channelId);
  return Boolean(entry?.hex && !entry.estimated);
}

export function getNamuwikiThemeMeta() {
  return themeData.meta;
}
