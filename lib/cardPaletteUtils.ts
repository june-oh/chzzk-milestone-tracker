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
    return {
      cardBg: "rgba(255, 255, 255, 0.55)",
      cardBorder: "rgba(0, 0, 0, 0.08)",
      accentHex: "#787878",
      accentRgb: "120, 120, 120",
    };
  }

  const r = Number(match[1]);
  const g = Number(match[2]);
  const b = Number(match[3]);
  return {
    cardBg: `rgba(${r}, ${g}, ${b}, 0.16)`,
    cardBorder: `rgba(${r}, ${g}, ${b}, 0.38)`,
    accentHex: rgbToHex(Math.round(r * 0.82), Math.round(g * 0.82), Math.round(b * 0.82)),
    accentRgb: `${r}, ${g}, ${b}`,
  };
}
