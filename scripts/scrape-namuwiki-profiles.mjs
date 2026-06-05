/**
 * Scrape namu.wiki page URLs and birthdays (MM-DD) for tracked streamers.
 * Usage: node scripts/scrape-namuwiki-profiles.mjs [--write] [--perplexity]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { FALLBACK_STREAMERS } from "../lib/streamersConfig.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_PATH = path.join(__dirname, "../data/namuwiki-profiles.json");

/** Known exact namu.wiki page titles. */
const NAMU_TITLES = {
  "65c3035bdc598c81f15a8fe0e958b3ce": "초승달(인터넷 방송인)",
  "4de764d9dad3b25602284be6db3ac647": "아리사(인터넷 방송인)",
  "32fb866e323242b770cdc790f991a6f6": "카arin(인터넷 방송인)",
  "475313e6c26639d5763628313b4c130e": "엘리양",
  "17d8605fc37fb5ef49f5f67ae786fe4e": "에리스(인터넷 방송인)",
  "a67b328bcc8eea4451ccfa754bc19ae1": "달콤레나 씨",
  "a3ceb9179d99be8d1e63b3e911fcd16b": "키유",
  "088973112d8acc831ec20274f7ffbb99": "미하루(인터넷 방송인)",
  "c8adce2ff4a3618931e07c327e1fa070": "포키쨩",
  "6ccaebc2569f62344c6fc257f8f2b9ad": "엘시v",
  "d5e2e0c14dcca4c4b10c7c9633022f52": "치치(Planeta)",
  "5ead7124638ac4c568f2cde0224b3b6b": "카네코 파냐",
  "941ea3807ba8b9b7dddb1670e3e7e5af": "아마네 나기",
  "59aa824e4c4a56dd51e7a5e2e9172648": "쿠온 레이",
  "c0d9723cbb75dc223c6aa8a9d4f56002": "허니츄러스",
  "65a53076fe1a39636082dd6dba8b8a4b": "오화요(인터넷 방송인)",
  "b82e8bc2505e37156b2d1140ba1fc05c": "담유이(인터넷 방송인)",
  "798e100206987b59805cfb75f927e965": "디디디용(인터넷 방송인)",
  "abe8aa82baf3d3ef54ad8468ee73e7fc": "아야(인터넷 방송인)",
  "bd07973b6021d72512240c01a386d5c9": "망내(인터넷 방송인)",
  "3e3781d3bd20dadc2f6f6d5d30091195": "포포포포(인터넷 방송인)",
  "5c897b3e639045ca6e314bbaff991f73": "비올레타 모네",
  "dae2de8eaa005a59163f2e4c045e1aa1": "블레어 로즈",
  "b33c957eac9335d38e4043c3dca97675": "하시요(인터넷 방송인)",
  "f36320c432d9f06095ce2cfbbf681c26": "류시호(인터넷 방송인)",
  "e87999abca4fd0c3214e05ef414ce951": "야토(인터넷 방송인)",
  "f3b204dd3fd6925835ca1848cd4b6d3c": "오단밍",
  "9351fb8417f73405c84e0846409e3263": "햄쿠bi",
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
  "a54372e8197f6d241a43a318279860d6": "쿠레나이 나츠키",
  "0a2020b09b8cc7f2285b7ae5de2ce4d3": "테리 눈나",
  "a048127622edd6c3ee8e477471a1d823": "빙하유",
  "f1869f490ddd660c420b2f57c649e6bb": "양메이",
  "29a1ed5c0829fa620fab900dba7e011b": "유리리",
  "0f61ae00c2aef2b789dc009e51cbcc5a": "온 하루",
  "7b9c6553913c755812ef2cd9fbe1dc5c": "하네(인터넷 방송인)",
  "f42e97f59c3177b8686dccfbf90792dd": "김아테",
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function guessNamuTitle(streamer) {
  if (NAMU_TITLES[streamer.channelId]) return NAMU_TITLES[streamer.channelId];
  const base = streamer.channelName.split(" ")[0];
  return `${base}(인터넷 방송인)`;
}

function namuUrl(title) {
  return `https://namu.wiki/w/${encodeURIComponent(title)}`;
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function parseBirthday(html) {
  const slice = html.match(/(?:생일|출생)[\s\S]{0,600}/i)?.[0];
  if (!slice) return null;

  const full = slice.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/);
  if (full) return `${pad2(full[2])}-${pad2(full[3])}`;

  const partial = slice.match(/(\d{1,2})월\s*(\d{1,2})일/);
  if (partial) return `${pad2(partial[1])}-${pad2(partial[2])}`;

  return null;
}

function pageExists(html, status) {
  if (!html || status !== 200) return false;
  if (/문서가 존재하지 않/.test(html)) return false;
  if (/이 문서는 .*에 의해 삭제/.test(html)) return false;
  return true;
}

async function fetchNamuTitle(title) {
  const url = namuUrl(title);
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; chzzk-milestone-profile-bot/1.0)",
      Accept: "text/html",
    },
  });
  if (!res.ok) return { url, html: null, status: res.status };
  return { url, html: await res.text(), status: res.status };
}

async function perplexityFill(missing) {
  const key = process.env.PERPLEXITY_API_KEY;
  if (!key || missing.length === 0) return {};

  const list = missing.map((s) => `${s.channelName} (id:${s.channelId})`).join("\n");
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
          content: `For each VTuber streamer below, find their namu.wiki page title and birthday (MM-DD) from namu.wiki infobox only. JSON array only: [{"channelId":"...","pageTitle":"... or null","birthday":"MM-DD or null"}]\n\n${list}`,
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
  const byId = {};
  for (const row of rows) {
    if (row.channelId) byId[row.channelId] = row;
  }
  return byId;
}

async function main() {
  const write = process.argv.includes("--write");
  const usePerplexity = process.argv.includes("--perplexity");
  const profiles = {};
  const missing = [];

  for (const streamer of FALLBACK_STREAMERS) {
    const title = guessNamuTitle(streamer);
    process.stdout.write(`→ ${streamer.channelName} (${title})... `);
    try {
      const { url, html, status } = await fetchNamuTitle(title);
      if (!pageExists(html, status)) {
        console.log(`skip (${status})`);
        missing.push(streamer);
        await sleep(1200);
        continue;
      }
      const birthday = parseBirthday(html);
      profiles[streamer.channelId] = {
        channelName: streamer.channelName,
        pageTitle: title,
        url,
        birthday,
      };
      console.log(birthday ? `ok · ${birthday}` : "ok · no birthday");
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
      const row = filled[streamer.channelId];
      if (row?.pageTitle) {
        const { url, html, status } = await fetchNamuTitle(row.pageTitle);
        if (pageExists(html, status)) {
          profiles[streamer.channelId] = {
            channelName: streamer.channelName,
            pageTitle: row.pageTitle,
            url,
            birthday: parseBirthday(html) ?? row.birthday ?? null,
          };
          continue;
        }
      }
      if (row?.pageTitle) {
        profiles[streamer.channelId] = {
          channelName: streamer.channelName,
          pageTitle: row.pageTitle,
          url: namuUrl(row.pageTitle),
          birthday: row.birthday ?? null,
        };
      }
    }
  }

  const payload = {
    meta: {
      updatedAt: new Date().toISOString(),
      count: Object.keys(profiles).length,
      total: FALLBACK_STREAMERS.length,
    },
    profiles,
  };

  console.log(`\nResolved ${Object.keys(profiles).length}/${FALLBACK_STREAMERS.length}`);

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
