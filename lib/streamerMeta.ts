import softconHistoryJson from "@/data/softcon-history.json";

export type GroupTag =
  | "CLUEZ"
  | "ENCHANT"
  | "Planeta"
  | "AESTHER"
  | "Honeyz"
  | "ACAXIA"
  | "Listella"
  | "StelLive"
  | "OverTheWall";

export const GROUP_FILTER_ORDER: GroupTag[] = [
  "CLUEZ",
  "ENCHANT",
  "AESTHER",
  "Planeta",
  "Honeyz",
  "ACAXIA",
  "Listella",
  "StelLive",
  "OverTheWall",
];

export type ManualFollowerPoint = {
  date: string;
  followers: number;
};

export type ManualHoursPoint = {
  date: string;
  hours: number;
};

export type ManualWeeklyHoursPoint = {
  date: string;
  weeklyHours: number;
};

type SoftconChannelHistory = {
  followers?: ManualFollowerPoint[];
  weeklyHours?: ManualWeeklyHoursPoint[];
  cumulativeHours?: ManualHoursPoint[];
  currentFollowers?: number;
};

const SOFTCON_HISTORY = softconHistoryJson as Record<string, SoftconChannelHistory>;

const GROUP_TAGS: Record<string, GroupTag> = {
  "a3ceb9179d99be8d1e63b3e911fcd16b": "CLUEZ", // 키유 Kiyuu
  "088973112d8acc831ec20274f7ffbb99": "CLUEZ", // 미하루 Miharu
  "a67b328bcc8eea4451ccfa754bc19ae1": "ENCHANT", // 달콤레나 씨
  "6ccaebc2569f62344c6fc257f8f2b9ad": "ENCHANT", // 엘시v
  "65c3035bdc598c81f15a8fe0e958b3ce": "ENCHANT", // 초승달
  "4de764d9dad3b25602284be6db3ac647": "AESTHER", // 아리사
  "32fb866e323242b770cdc790f991a6f6": "AESTHER", // 카린
  "475313e6c26639d5763628313b4c130e": "AESTHER", // 엘리
  "17d8605fc37fb5ef49f5f67ae786fe4e": "AESTHER", // 에리스
  "d5e2e0c14dcca4c4b10c7c9633022f52": "Planeta", // 치치
  "5ead7124638ac4c568f2cde0224b3b6b": "Planeta", // 카네코 파냐
  "941ea3807ba8b9b7dddb1670e3e7e5af": "Planeta", // 아마네 나기
  "59aa824e4c4a56dd51e7a5e2e9172648": "Planeta", // 쿠온 레이
  "c0d9723cbb75dc223c6aa8a9d4f56002": "Honeyz", // 허니츄러스
  "65a53076fe1a39636082dd6dba8b8a4b": "Honeyz", // 오화요
  "b82e8bc2505e37156b2d1140ba1fc05c": "Honeyz", // 담유이
  "798e100206987b59805cfb75f927e965": "Honeyz", // 디디디용
  "abe8aa82baf3d3ef54ad8468ee73e7fc": "Honeyz", // 아야
  "bd07973b6021d72512240c01a386d5c9": "Honeyz", // 망내
  "3e3781d3bd20dadc2f6f6d5d30091195": "ACAXIA", // 포포포포
  "5c897b3e639045ca6e314bbaff991f73": "ACAXIA", // 비올레타 모네
  "dae2de8eaa005a59163f2e4c045e1aa1": "ACAXIA", // 블레어 로즈
  "b33c957eac9335d38e4043c3dca97675": "ACAXIA", // 하시요
  "f36320c432d9f06095ce2cfbbf681c26": "ACAXIA", // 류시호
  "e87999abca4fd0c3214e05ef414ce951": "Listella", // 야토
  "f3b204dd3fd6925835ca1848cd4b6d3c": "Listella", // 오단밍
  "9351fb8417f73405c84e0846409e3263": "Listella", // 햄쿠비
  "4325b1d5bbc321fad3042306646e2e50": "StelLive", // 아카네 리제
  "64d76089fba26b180d9c9e48a32600d9": "StelLive", // 텐코 시부키
  "a6c4ddb09cdb160478996007bff35296": "StelLive", // 아라하시 타비
  "4515b179f86b67b4981e16190817c580": "StelLive", // 네네코 마시로
  "b044e3a3b9259246bc92e863e7d3f3b8": "StelLive", // 시라유키 히나
  "45e71a76e949e16a34764deb962f9d9f": "StelLive", // 아야츠노 유니
  "36ddb9bb4f17593b60f1b63cec86611d": "StelLive", // 사키하네 후야
  "516937b5f85cbf2249ce31b0ad046b0f": "StelLive", // 아오쿠모 린
  "4d812b586ff63f8a2946e64fa860bbf5": "StelLive", // 하나코 나나
  "8fd39bb8de623317de90654718638b10": "StelLive", // 유즈하 리코
  "a54372e8197f6d241a43a318279860d6": "OverTheWall", // 쿠레나이 나츠키
  "0a2020b09b8cc7f2285b7ae5de2ce4d3": "OverTheWall", // 테리 눈나
  "a048127622edd6c3ee8e477471a1d823": "OverTheWall", // 빙하유
  "f1869f490ddd660c420b2f57c649e6bb": "OverTheWall", // 양메이
  "29a1ed5c0829fa620fab900dba7e011b": "OverTheWall", // 유리리
  "0f61ae00c2aef2b789dc009e51cbcc5a": "OverTheWall", // 온 하루
  "7b9c6553913c755812ef2cd9fbe1dc5c": "OverTheWall", // 하네
  "f42e97f59c3177b8686dccfbf90792dd": "OverTheWall", // 김아테
};

function getSoftconEntry(channelId: string): SoftconChannelHistory | undefined {
  const entry = SOFTCON_HISTORY[channelId];
  if (!entry) return undefined;
  return entry;
}

export function getGroupTag(channelId: string): GroupTag | undefined {
  return GROUP_TAGS[channelId];
}

export function getManualFollowerHistory(channelId: string): ManualFollowerPoint[] {
  const fromJson = getSoftconEntry(channelId)?.followers;
  if (fromJson && fromJson.length > 0) return fromJson;
  return [];
}

/** Build monotonic cumulative hours from Softcon weekly bars, scaled to target total. */
export function buildCumulativeFromWeekly(
  weekly: ManualWeeklyHoursPoint[],
  targetTotal?: number
): ManualHoursPoint[] {
  if (weekly.length === 0) return [];

  let sum = 0;
  const rawCumulative = weekly.map((week) => {
    sum += week.weeklyHours;
    return { date: week.date, hours: Math.round(sum) };
  });

  const target = targetTotal ?? rawCumulative[rawCumulative.length - 1]?.hours ?? 0;
  const rawTotal = rawCumulative[rawCumulative.length - 1]?.hours ?? 0;
  if (target <= 0 || rawTotal <= 0 || Math.abs(rawTotal - target) <= 5) {
    if (rawCumulative.length > 0) {
      rawCumulative[rawCumulative.length - 1] = {
        ...rawCumulative[rawCumulative.length - 1],
        hours: target || rawTotal,
      };
    }
    return rawCumulative;
  }

  const scale = target / rawTotal;
  let cumulative = 0;
  return weekly.map((week, index) => {
    cumulative += week.weeklyHours * scale;
    const hours = index === weekly.length - 1 ? target : Math.round(cumulative);
    return { date: week.date, hours };
  });
}

export function getManualWeeklyHoursHistory(channelId: string): ManualWeeklyHoursPoint[] {
  const fromJson = getSoftconEntry(channelId)?.weeklyHours;
  if (fromJson && fromJson.length > 0) return fromJson;
  return [];
}

/** Cumulative broadcast hours built from Softcon weekly bars. */
export function getManualCumulativeHoursHistory(
  channelId: string,
  targetTotal?: number
): ManualHoursPoint[] {
  const entry = getSoftconEntry(channelId);
  const weekly = entry?.weeklyHours;
  if (weekly && weekly.length > 0) {
    return buildCumulativeFromWeekly(weekly, targetTotal);
  }
  const fromJson = entry?.cumulativeHours;
  if (fromJson && fromJson.length > 0) return fromJson;
  return [];
}

export function hasSoftconHoursHistory(channelId: string): boolean {
  return (
    getManualWeeklyHoursHistory(channelId).length > 0 ||
    getManualCumulativeHoursHistory(channelId).length > 0
  );
}

export function hasSoftconFollowerHistory(channelId: string): boolean {
  return getManualFollowerHistory(channelId).length > 0;
}

function parseSoftconDateMs(date: string): number {
  if (date.includes("T")) return new Date(date).getTime();
  return new Date(`${date}T12:00:00`).getTime();
}

/** Interpolate when a cumulative series crosses a target value (Softcon-sourced). */
function projectSeriesCrossing(
  history: { date: string; value: number }[],
  target: number
): string | null {
  for (let i = 1; i < history.length; i++) {
    const prev = history[i - 1];
    const curr = history[i];
    if (prev.value <= target && curr.value >= target && curr.value > prev.value) {
      const ratio = (target - prev.value) / (curr.value - prev.value);
      const ms = parseSoftconDateMs(prev.date) + ratio * (parseSoftconDateMs(curr.date) - parseSoftconDateMs(prev.date));
      return new Date(ms).toISOString();
    }
  }
  return null;
}

export function getSoftconHoursMilestoneDate(channelId: string, milestoneHours: number): string | null {
  const entry = getSoftconEntry(channelId);
  const history = getManualCumulativeHoursHistory(
    channelId,
    entry?.cumulativeHours?.[entry.cumulativeHours.length - 1]?.hours
  );
  if (history.length === 0) return null;
  return projectSeriesCrossing(
    history.map((point) => ({ date: point.date, value: point.hours })),
    milestoneHours
  );
}

export function getSoftconFollowerMilestoneDate(channelId: string, milestoneFollowers: number): string | null {
  const history = getManualFollowerHistory(channelId);
  if (history.length === 0) return null;
  return projectSeriesCrossing(
    history.map((point) => ({ date: point.date, value: point.followers })),
    milestoneFollowers
  );
}

type StreamerHistoryRow = {
  date: string;
  hours: number;
  followers?: number;
};

type EnrichableStreamer = {
  channelId: string;
  totalLiveHours: number;
  followerCount?: number;
  groupTag?: GroupTag;
  history?: StreamerHistoryRow[];
};

export function enrichStreamer<T extends EnrichableStreamer>(streamer: T): T {
  const groupTag = getGroupTag(streamer.channelId);
  const manualFollowers = getManualFollowerHistory(streamer.channelId);
  const manualHours = getManualCumulativeHoursHistory(
    streamer.channelId,
    streamer.totalLiveHours
  );
  const historyByDate = new Map<string, StreamerHistoryRow>();

  (streamer.history || []).forEach((row) => {
    historyByDate.set(row.date, { ...row });
  });

  manualHours.forEach((point) => {
    const existing = historyByDate.get(point.date);
    historyByDate.set(point.date, {
      date: point.date,
      hours: point.hours,
      followers: existing?.followers,
    });
  });

  manualFollowers.forEach((point) => {
    const existing = historyByDate.get(point.date);
    historyByDate.set(point.date, {
      date: point.date,
      hours: existing?.hours ?? streamer.totalLiveHours,
      followers: point.followers,
    });
  });

  const mergedHistory =
    manualFollowers.length > 0 || manualHours.length > 0 || historyByDate.size > 0
      ? Array.from(historyByDate.values()).sort((a, b) => a.date.localeCompare(b.date))
      : streamer.history;

  const latestManualFollowers =
    manualFollowers.length > 0
      ? manualFollowers[manualFollowers.length - 1].followers
      : getSoftconEntry(streamer.channelId)?.currentFollowers;

  const latestManualHours =
    manualHours.length > 0 ? manualHours[manualHours.length - 1].hours : undefined;

  return {
    ...streamer,
    ...(groupTag ? { groupTag } : {}),
    ...(mergedHistory ? { history: mergedHistory } : {}),
    ...(latestManualFollowers !== undefined
      ? { followerCount: Math.max(streamer.followerCount || 0, latestManualFollowers) }
      : {}),
    ...(latestManualHours !== undefined
      ? { totalLiveHours: Math.max(streamer.totalLiveHours, Math.round(latestManualHours)) }
      : {}),
  };
}
