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
  "6ccaebc2569f62344c6fc257f8f2b9ad": "엘시(인터넷 방송인)",
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

/** Group pages where member 생일/출생 may be listed. */
const GROUP_PAGES = {
  "32fb866e323242b770cdc790f991a6f6": ["AESTHER", "카arin(인터넷 방송인)", "카arin", "카arin(버튜버)"],
  "a67b328bcc8eea4451ccfa754bc19ae1": ["ENCHANT", "달콤레나 씨", "달콤레나"],
  "6ccaebc2569f62344c6fc257f8f2b9ad": ["ENCHANT", "엘시v", "엘시 v", "엘시V"],
  "d5e2e0c14dcca4c4b10c7c9633022f52": ["Planeta", "치치(Planeta)", "치치"],
  "59aa824e4c4a56dd51e7a5e2e9172648": ["Planeta", "쿠온 레이"],
  "65a53076fe1a39636082dd6dba8b8a4b": ["Honeyz", "오화요(인터넷 방송인)", "오화요"],
  "b82e8bc2505e37156b2d1140ba1fc05c": ["Honeyz", "담유이(인터넷 방송인)", "담유이"],
  "798e100206987b59805cfb75f927e965": ["Honeyz", "디디디용(인터넷 방송인)", "디디디용"],
  "bd07973b6021d72512240c01a386d5c9": ["Honeyz", "망내(인터넷 방송인)", "망내"],
  "3e3781d3bd20dadc2f6f6d5d30091195": ["PROJECT [i]", "포포포포(인터넷 방송인)", "포포포포"],
  "b33c957eac9335d38e4043c3dca97675": ["PROJECT [i]", "하시요(인터넷 방송인)", "하시요"],
  "9351fb8417f73405c84e0846409e3263": ["Listella", "햄쿠bi", "햄쿠비"],
  "29a1ed5c0829fa620fab900dba7e011b": ["Over The Wall", "유리리(인터넷 방송인)", "유리리"],
  "0f61ae00c2aef2b789dc009e51cbcc5a": ["Over The Wall", "온 하루", "온하루"],
  "f42e97f59c3177b8686dccfbf90792dd": ["Over The Wall", "김아테", "김아테 l Ate"],
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function stripHtml(text) {
  return text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function namuUrl(title) {
  return `https://namu.wiki/w/${encodeURIComponent(title)}`;
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function extractMmDd(text) {
  const full = text.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/);
  if (full) return `${pad2(full[2])}-${pad2(full[3])}`;

  const partial = text.match(/(\d{1,2})월\s*(\d{1,2})일/);
  if (partial) return `${pad2(partial[1])}-${pad2(partial[2])}`;

  return null;
}

function extractYmd(text) {
  const full = text.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/);
  if (full) return `${full[1]}-${pad2(full[2])}-${pad2(full[3])}`;
  return null;
}

function parseFieldsFromHtml(html, names) {
  const birthday = parseBirthdayFromInfobox(html) ?? parseBirthdayNearName(html, names);
  const debutDate = parseDebutFromInfobox(html) ?? parseDebutNearName(html, names);
  return { birthday, debutDate };
}

/** Infobox 생일/출생 row. */
function parseBirthdayFromInfobox(html) {
  const slices = [
    ...(html.match(/(?:생일|출생)[\s\S]{0,800}/gi) ?? []),
    ...(html.match(/(?:birthday|Birth)[\s\S]{0,400}/gi) ?? []),
  ];

  for (const slice of slices) {
    const birthday = extractMmDd(stripHtml(slice));
    if (birthday) return birthday;
  }
  return null;
}

/** Infobox 데뷔/첫 방송일 row. */
function parseDebutFromInfobox(html) {
  const slices = [
    ...(html.match(/(?:데뷔|첫\s*방송일|첫방송일)[\s\S]{0,800}/gi) ?? []),
  ];

  for (const slice of slices) {
    const debutDate = extractYmd(stripHtml(slice));
    if (debutDate) return debutDate;
  }
  return null;
}

/** Find 데뷔/첫 방송일 near a member name (group pages). */
function parseDebutNearName(html, names) {
  const plain = stripHtml(html);

  for (const name of names) {
    if (!name || name.length < 2) continue;
    let idx = plain.indexOf(name);
    while (idx !== -1) {
      const window = plain.slice(Math.max(0, idx - 120), idx + 420);
      if (/(데뷔|첫\s*방송)/.test(window)) {
        const debutDate = extractYmd(window);
        if (debutDate) return debutDate;
      }
      idx = plain.indexOf(name, idx + name.length);
    }
  }

  return null;
}

function searchNamesForStreamer(streamer) {
  const names = new Set();
  const raw = streamer.channelName;
  names.add(raw);
  names.add(raw.split(" ")[0]);
  names.add(raw.replace(/ Planeta$/, ""));
  names.add(raw.replace(/\s+[A-Za-z].*$/, "").trim());
  names.add(raw.replace(/ㅣ.*$/, "").trim());
  if (NAMU_TITLES[streamer.channelId]) {
    names.add(NAMU_TITLES[streamer.channelId]);
    names.add(NAMU_TITLES[streamer.channelId].replace(/\(.*\)$/, "").trim());
  }
  return [...names].filter(Boolean);
}

/** Find 생일/출생 near a member name (group pages, long docs). */
function parseBirthdayNearName(html, names) {
  const plain = stripHtml(html);

  for (const name of names) {
    if (!name || name.length < 2) continue;
    let idx = plain.indexOf(name);
    while (idx !== -1) {
      const window = plain.slice(Math.max(0, idx - 120), idx + 420);
      if (/(생일|출생)/.test(window)) {
        const birthday = extractMmDd(window);
        if (birthday) return birthday;
      }
      idx = plain.indexOf(name, idx + name.length);
    }
  }

  return null;
}

function titleCandidates(streamer) {
  const candidates = new Set();
  const id = streamer.channelId;
  const name = streamer.channelName;

  if (NAMU_TITLES[id]) candidates.add(NAMU_TITLES[id]);

  const parts = name.split(/\s+/);
  candidates.add(name);
  candidates.add(parts[0]);
  candidates.add(name.replace(/ Planeta$/, ""));
  candidates.add(`${parts[0]}(인터넷 방송인)`);
  candidates.add(`${name.replace(/ Planeta$/, "")}(인터넷 방송인)`);

  if (name.includes(" ")) {
    candidates.add(parts.slice(0, 2).join(" "));
    candidates.add(`${parts.slice(0, 2).join(" ")}(인터넷 방송인)`);
  }

  for (const groupTitle of GROUP_PAGES[id] ?? []) {
    candidates.add(groupTitle);
  }

  return [...candidates];
}

const INVALID_PAGE_TITLES = new Set([
  "생일",
  "출생",
  "Birthday",
  "birthday",
  "온",
  "쿠온",
  "카린",
  "치치 곤잘레스",
  "유리리 나카",
]);

function isValidPageTitle(title) {
  if (!title || INVALID_PAGE_TITLES.has(title)) return false;
  return title.trim().length >= 2;
}

function titleLikelyMatches(title, names, channelId) {
  if (!isValidPageTitle(title)) return false;
  if (NAMU_TITLES[channelId] === title) return true;
  const bare = title.replace(/\(.*\)$/, "").trim();
  if (bare.length <= 2) return false;

  return names.some((name) => {
    const base = name.split(" ")[0].replace(/ Planeta$/, "");
    if (base.length < 2) return false;
    if (title.includes(base) || bare === base || bare.includes(base)) return true;
    return false;
  });
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
  if (!res.ok) return { url, html: null, status: res.status, title };
  return { url, html: await res.text(), status: res.status, title };
}

async function searchNamuTitles(query) {
  const url = `https://namu.wiki/Search?q=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; chzzk-milestone-profile-bot/1.0)",
      Accept: "text/html",
    },
  });
  if (!res.ok) return [];
  const html = await res.text();
  const titles = new Set();
  const re = /href="\/w\/([^"?#]+)"/g;
  let match;
  while ((match = re.exec(html))) {
    try {
      titles.add(decodeURIComponent(match[1].replace(/\+/g, " ")));
    } catch {
      titles.add(match[1]);
    }
  }
  return [...titles].slice(0, 8);
}

async function resolveStreamerProfile(streamer) {
  const names = searchNamesForStreamer(streamer);
  let best = null;

  const titles = [];
  if (NAMU_TITLES[streamer.channelId]) titles.push(NAMU_TITLES[streamer.channelId]);
  for (const title of titleCandidates(streamer)) {
    if (!titles.includes(title)) titles.push(title);
  }

  for (const title of titles) {
    const fetched = await fetchNamuTitle(title);
    await sleep(600);
    if (!pageExists(fetched.html, fetched.status)) continue;

    const { birthday, debutDate } = parseFieldsFromHtml(fetched.html, names);
    const isGroupPage = Boolean(GROUP_PAGES[streamer.channelId]?.includes(title));

    if (!isGroupPage) {
      const profile = {
        channelName: streamer.channelName,
        pageTitle: title,
        url: fetched.url,
        birthday,
        debutDate,
        source: "namuwiki:page",
      };
      if (birthday || titleLikelyMatches(title, names, streamer.channelId) || NAMU_TITLES[streamer.channelId] === title) {
        return profile;
      }
      if (!best || (!best.birthday && birthday)) best = profile;
      continue;
    }

    if (birthday && !best?.birthday) {
      best = {
        channelName: streamer.channelName,
        pageTitle: title,
        url: fetched.url,
        birthday,
        debutDate,
        source: "namuwiki:group",
      };
    } else if (!best) {
      best = {
        channelName: streamer.channelName,
        pageTitle: title,
        url: fetched.url,
        birthday: null,
        debutDate: debutDate ?? null,
        source: "namuwiki:group",
      };
    } else if (debutDate && !best.debutDate) {
      best.debutDate = debutDate;
    }
  }

  if (best?.birthday || best?.debutDate) return best;

  for (const query of [`${names[0]} 생일`, `${names[0]} 출생`, `${names[0]} 인터넷 방송인`, `${names[0]} 데뷔`]) {
    const titles = await searchNamuTitles(query);
    await sleep(600);
    for (const title of titles) {
      if (/분류:|틀:|파일:/.test(title)) continue;
      if (!isValidPageTitle(title)) continue;
      const fetched = await fetchNamuTitle(title);
      await sleep(600);
      if (!pageExists(fetched.html, fetched.status)) continue;

      const { birthday, debutDate } = parseFieldsFromHtml(fetched.html, names);
      const isLikelyPersonal = titleLikelyMatches(title, names, streamer.channelId);

      if ((birthday || debutDate) && (isLikelyPersonal || parseBirthdayNearName(fetched.html, names) || parseDebutNearName(fetched.html, names))) {
        return {
          channelName: streamer.channelName,
          pageTitle: title,
          url: fetched.url,
          birthday,
          debutDate,
          source: isLikelyPersonal ? "namuwiki:search" : "namuwiki:search-group",
        };
      }

      if (isLikelyPersonal && !best) {
        best = {
          channelName: streamer.channelName,
          pageTitle: title,
          url: fetched.url,
          birthday: null,
          debutDate: debutDate ?? null,
          source: "namuwiki:search",
        };
      }
    }
  }

  return best;
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
          content: `For each VTuber streamer below, find namu.wiki page title and birthday (MM-DD) from infobox 생일 or 출생 field. JSON only: [{"channelId":"...","pageTitle":"... or null","birthday":"MM-DD or null"}]\n\n${list}`,
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

function isManualProfile(profile) {
  return profile?.source === "manual" || profile?.source?.startsWith("manual");
}

async function patchExistingProfiles(profiles) {
  for (const streamer of FALLBACK_STREAMERS) {
    const existing = profiles[streamer.channelId];
    if (!existing?.pageTitle) continue;
    if (isManualProfile(existing)) {
      console.log(`↻ ${streamer.channelName}... manual skip`);
      continue;
    }

    process.stdout.write(`↻ ${streamer.channelName}... `);
    const { html, status } = await fetchNamuTitle(existing.pageTitle);
    await sleep(600);
    if (!pageExists(html, status)) {
      console.log("skip");
      continue;
    }

    const fields = parseFieldsFromHtml(html, searchNamesForStreamer(streamer));
    if (fields.birthday) existing.birthday = fields.birthday;
    if (fields.debutDate) existing.debutDate = fields.debutDate;
    console.log(
      `${existing.birthday ?? "-"} · ${existing.debutDate ?? "-"}`
    );
  }
}

async function main() {
  const write = process.argv.includes("--write");
  const usePerplexity = process.argv.includes("--perplexity");
  const patchOnly = process.argv.includes("--patch-only");
  const profiles = patchOnly && fs.existsSync(OUT_PATH)
    ? JSON.parse(fs.readFileSync(OUT_PATH, "utf8")).profiles
    : {};
  const missing = [];

  if (patchOnly) {
    console.log(`Patching ${Object.keys(profiles).length} existing profiles...\n`);
    await patchExistingProfiles(profiles);
  } else {
    for (const streamer of FALLBACK_STREAMERS) {
      process.stdout.write(`→ ${streamer.channelName}... `);
      try {
        const profile = await resolveStreamerProfile(streamer);
        if (profile) {
          profiles[streamer.channelId] = profile;
          const tag = [profile.birthday, profile.debutDate].filter(Boolean).join(" · ") || "partial";
          console.log(`${profile.pageTitle ?? "?"} · ${tag}`);
        } else {
          console.log("not found");
          missing.push(streamer);
        }
      } catch (err) {
        console.log("error", err.message);
        missing.push(streamer);
      }
    }
  }

  if (usePerplexity && missing.length) {
    console.log(`\nPerplexity fallback for ${missing.length} streamers...`);
    const filled = await perplexityFill(missing);
    for (const streamer of missing) {
      const row = filled[streamer.channelId];
      if (!row) continue;

      let birthday = row.birthday ?? null;
      let pageTitle = row.pageTitle ?? null;
      let url = pageTitle ? namuUrl(pageTitle) : null;

      if (pageTitle) {
        const { html, status } = await fetchNamuTitle(pageTitle);
        await sleep(600);
        if (pageExists(html, status)) {
          birthday =
            parseBirthdayFromInfobox(html) ??
            parseBirthdayNearName(html, searchNamesForStreamer(streamer)) ??
            birthday;
          url = namuUrl(pageTitle);
        }
      }

      if (pageTitle || birthday) {
        profiles[streamer.channelId] = {
          channelName: streamer.channelName,
          pageTitle,
          url,
          birthday,
          source: "perplexity",
        };
      }
    }
  }

  // Second pass: fill missing birthday/debut on existing pages
  for (const streamer of FALLBACK_STREAMERS) {
    const existing = profiles[streamer.channelId];
    if (!existing?.pageTitle) continue;
    if (isManualProfile(existing)) continue;
    if (existing.birthday && existing.debutDate) continue;

    const { html, status } = await fetchNamuTitle(existing.pageTitle);
    await sleep(600);
    if (!pageExists(html, status)) continue;

    const fields = parseFieldsFromHtml(html, searchNamesForStreamer(streamer));
    if (!existing.birthday && fields.birthday) {
      existing.birthday = fields.birthday;
      existing.source = `${existing.source}+birthday`;
    }
    if (!existing.debutDate && fields.debutDate) {
      existing.debutDate = fields.debutDate;
      existing.source = `${existing.source}+debut`;
    }
  }

  for (const streamer of FALLBACK_STREAMERS) {
    const profile = profiles[streamer.channelId];
    if (profile && profile.debutDate === undefined) profile.debutDate = null;
    if (profile && profile.birthday === undefined) profile.birthday = null;
  }

  const payload = {
    meta: {
      updatedAt: new Date().toISOString(),
      count: Object.keys(profiles).length,
      withBirthday: Object.values(profiles).filter((p) => p.birthday).length,
      withDebut: Object.values(profiles).filter((p) => p.debutDate).length,
      total: FALLBACK_STREAMERS.length,
    },
    profiles,
  };

  console.log(
    `\nResolved ${Object.keys(profiles).length}/${FALLBACK_STREAMERS.length} · birthdays ${payload.meta.withBirthday} · debuts ${payload.meta.withDebut}`
  );

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
