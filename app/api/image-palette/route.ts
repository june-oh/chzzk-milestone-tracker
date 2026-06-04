import { NextRequest, NextResponse } from "next/server";
import { extractPaletteFromImageUrl } from "@/lib/imagePalette";

export async function GET(req: NextRequest) {
  const imageUrl = req.nextUrl.searchParams.get("url");

  if (!imageUrl || !imageUrl.startsWith("https://")) {
    return NextResponse.json({ success: false, error: "Invalid image URL" }, { status: 400 });
  }

  const palette = await extractPaletteFromImageUrl(imageUrl);
  if (!palette) {
    return NextResponse.json({ success: false, error: "Palette extraction failed" }, { status: 422 });
  }

  return NextResponse.json({ success: true, ...palette });
}
