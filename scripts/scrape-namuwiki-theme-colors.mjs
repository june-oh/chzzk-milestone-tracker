/**
 * Scrape namu.wiki infobox "상징색" for streamers.
 * Usage: node scripts/scrape-namuwiki-theme-colors.mjs [--write]
 *
 * Optional Perplexity fallback for missing entries (requires PERPLEXITY_API_KEY):
 *   node scripts/scrape-namuwiki-theme-colors.mjs --perplexity --write
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { FALLBACK_STREAMERS } from "../lib/streamersConfig.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_PATH = path.join(__dirname, "../data/namuwiki-theme-colors.json");

/** Known namu.wiki page titles (exact). */
const NAMU_TITLES = {
  "65c3035bdc598c81f15a8fe0e958b3ce": "초승달(인터넷 방송인)",
  "4de764d9dad3b25602284be6db3ac647": "아리사(인터넷 방송인)",
  "32fb866e323242b770cdc790f991a6f6": "카린(인터넷 방송인)",
  "475313e6c26639d5763628313b4c130e": "엘리양",
  "17d8605fc37fb5ef49f5f67ae786fe4e": "에리스(인터넷 방송인)",
  "a67b328bcc8eea4451ccfa754bc19ae1": "달콤레나 씨",
  "a3ceb9179d99be8d1e63b3e911fcd16b": "키유(인터넷 방송인)",
  "088973112d8acc831ec20274f7ffbb99": "미하루(인터넷 방송인)",
  "c8adce2ff4a3618931e07c327e1fa070": "포키쨩",
  "6ccaebc2569f62344c6fc257f8f2b9ad": "엘시v",
  "c0d9723cbb75dc223c6aa8a9d4f56002": "허니츄러스",
  "65a53076fe1a39636082dd6dba8b8a4b": "오화요(인터넷 방송인)",
  "b82e8bc2505e37156b2d1140ba1fc05c": "담유이(인터넷 방송인)",
  "798e100206987b59805cfb75f927e965": "디디디용(인터넷 방송인)",
  "abe8aa82baf3d3ef54ad8468ee73e7fc": "아야(인터넷 방송인)",
  "bd07973b6021d72512240c01a386d5c9": "망내(인터넷 방송인)",
  "4325b1d5bbc321fad3042306646e2e50": "아카네 리제",
  "64d76089fba26b180d9c9e48a32600d9": "텐코 시부키",
  "a6c4ddb09cdb160478996007bff35296": "아라하시 타비",
  "4515b179f86b67b4981e16190817c580": "네네코 마시로",
  "b044e3a3b9259246bc92e863e7d3f3b8": "시라유키 히나",
  "45e71a76e949e16a34764deb962f9d9f": "아야츠노 유니",
  "36ddb9bb4f17593b60f1b63cec86611d": "사키하네 후야",
  "516937b5f85cbf2249ce31b0ad046b0f": "아오쿠모 린",
  "4d812b586ff63f8a2946e64fa860bbf5": "하나코 나나",
  "8fd39bb8de623317de90654718638b10": "유즈하 리코",
  "9351fb8417f73405c84e0846409e3263": "햄쿠비",
  "7b9c6553913c755812ef2cd9fbe1dc5c": "하네(인터넷 방송인)",
  "0a2020b09b8cc7f2285b7ae5de2ce4d3": "테리 눈나",
  "a54372e8197f6d241a43a318279860d6": "쿠레나이 나츠키",
};

const COLOR_NAME_HEX = {
  빨간색: "#E55567",
  "빨간색 계열": "#E55567",
  보라색: "#9333EA",
  "보라색 계열": "#9333EA",
  핑크: "#FF69B4",
  "핑크색 계열": "#FF69B4",
  하늘색: "#38BDF8",
  "하늘색 계열": "#38BDF8",
  노란색: "#FACC15",
  "노란색 계열": "#FACC15",
  초록색: "#22C55E",
  "초록색 계열": "#22C55E",
  라벤더: "#8EA0FF",
  "라벤더 블루 계열": "#8EA0FF",
  버건디: "#69242B",
  "버건디 계열": "#69242B",
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function guessNamuTitle(streamer) {
  if (NAMU_TITLES[streamer.channelId]) return NAMU_TITLES[streamer.channelId];
  const base = streamer.channelName.split(" ")[0];
  return `${base}(인터넷 방송인)`;
}

function parseSymbolColor(html) {
  const hexMatch = html.match(/상징색[\s\S]{0,120}?\(#([0-9a-fA-F]{6})\)/i);
  if (hexMatch) {
    const label = html.match(/상징색[\s\S]{0,80}?>\s*([^<(]+)/i)?.[1]?.trim() ?? "상징색";
    return { hex: `#${hexMatch[1].toUpperCase()}`, colorName: label, estimated: false };
  }

  const nameMatch = html.match(/상징색[\s\S]{0,200}?>\s*([^<\n]+?)\s*</i);
  if (nameMatch) {
    const raw = nameMatch[1].trim().replace(/\s+/g, " ");
    for (const [key, hex] of Object.entries(COLOR_NAME_HEX)) {
      if (raw.includes(key)) {
        return { hex, colorName: raw, estimated: true };
      }
    }
    return { hex: null, colorName: raw, estimated: true };
  }

  return null;
}

async function fetchNamuTitle(title) {
  const url = `https://namu.wiki/w/${encodeURIComponent(title)}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; chzzk-milestone-theme-bot/1.0)",
      Accept: "text/html",
    },
  });
  if (!res.ok) return { url, html: null, status: res.status };
  return { url, html: await res.text(), status: res.status };
}

async function perplexityFill(missing) {
  const key = process.env.PERPLEXITY_API_KEY;
  if (!key || missing.length === 0) return {};

  const names = missing.map((s) => s.channelName).join(", ");
  const res = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "sonar-pro",
      messages: [
        {
          role: "user",
          content: `나무위키(namu.wiki) 인포박스 '상징색' hex for VTuber streamers: ${names}. JSON only: [{"name":"...","hex":"#RRGGBB","colorName":"...","estimated":bool}]`,
        },
      ],
      search_domain_filter: ["namu.wiki"],
    }),
  });
  if (!res.ok) {
    console.warn("Perplexity failed:", res.status, await res.text());
    return {};
  }
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content ?? "";
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return {};
  const rows = JSON.parse(jsonMatch[0]);
  const byName = {};
  for (const row of rows) {
    if (row.hex) byName[row.name] = row;
  }
  return byName;
}

async function main() {
  const write = process.argv.includes("--write");
  const usePerplexity = process.argv.includes("--perplexity");
  const results = {};
  const missing = [];

  for (const streamer of FALLBACK_STREAMERS) {
    const title = guessNamuTitle(streamer);
    process.stdout.write(`→ ${streamer.channelName} (${title})... `);
    try {
      const { url, html, status } = await fetchNamuTitle(title);
      if (!html) {
        console.log(`skip (${status})`);
        missing.push(streamer);
        await sleep(1200);
        continue;
      }
      const parsed = parseSymbolColor(html);
      if (parsed?.hex) {
        results[streamer.channelId] = {
          channelName: streamer.channelName,
          hex: parsed.hex,
          colorName: parsed.colorName,
          source: url,
          estimated: parsed.estimated,
        };
        console.log(parsed.hex, parsed.estimated ? "(estimated)" : "");
      } else {
        console.log("no hex");
        missing.push(streamer);
      }
    } catch (err) {
      console.log("error", err.message);
      missing.push(streamer);
    }
    await sleep(1200);
  }

  if (usePerplexity && missing.length) {
    console.log(`\nPerplexity fallback for ${missing.length} streamers...`);
    const filled = await perplexityFill(missing);
    for (const streamer of missing) {
      const row =
        filled[streamer.channelName] ??
        filled[streamer.channelName.split(" ")[0]] ??
        Object.entries(filled).find(([k]) => streamer.channelName.includes(k))?.[1];
      if (row?.hex) {
        results[streamer.channelId] = {
          channelName: streamer.channelName,
          hex: row.hex.toUpperCase(),
          colorName: row.colorName ?? "상징색",
          source: "perplexity+namu.wiki",
          estimated: Boolean(row.estimated ?? true),
        };
      }
    }
  }

  const payload = {
    meta: {
      updatedAt: new Date().toISOString(),
      count: Object.keys(results).length,
      total: FALLBACK_STREAMERS.length,
    },
    colors: results,
  };

  console.log(`\nResolved ${Object.keys(results).length}/${FALLBACK_STREAMERS.length}`);

  if (write) {
    fs.writeFileSync(OUT_PATH, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
    console.log(`Wrote ${OUT_PATH}`);
  } else {
    console.log(JSON.stringify(payload, null, 2));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
