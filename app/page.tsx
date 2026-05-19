import { kv } from "@vercel/kv";
import ClientDashboard from "./components/ClientDashboard";

const FALLBACK_STREAMERS = [
  { channelId: "65c3035bdc598c81f15a8fe0e958b3ce", channelName: "초승달", channelImageUrl: "https://nng-phinf.pstatic.net/MjAyNjA0MTlfOTQg/MDAxNzc2NTkyMjU5ODk5._TnXjfSnOt5htcBgSxPj4BKXOv2ncFPbIPvx2guxVlwg.M3PH7PH8oadbIc0SZdWyD1wY6lVh2aOpMlKQ8puG-E0g.PNG/image.png", firstLiveDate: "2024-02-26 17:06:40", totalLiveHours: 4302, lastMilestone: 4000, cheerCount: 0, followerCount: 66939, color: "lilac" },
  { channelId: "4de764d9dad3b25602284be6db3ac647", channelName: "아리사", channelImageUrl: "https://nng-phinf.pstatic.net/MjAyNjA0MDJfMTk1/MDAxNzc1MTMzNjk5OTc1.XifMFawEqJ9B4cqYDAF9pjn2VoUNaIahdyNDtqRnDMQg.IyGl56yQUJAtB5ohqq8mUM2wqjvQ4cf4--LpB4jvzFIg.PNG/image.png", firstLiveDate: "2024-01-05 20:00:32", totalLiveHours: 7778, lastMilestone: 7000, cheerCount: 0, followerCount: 90518, color: "pink" },
  { channelId: "32fb866e323242b770cdc790f991a6f6", channelName: "카린", channelImageUrl: "https://nng-phinf.pstatic.net/MjAyNDA3MDdfMjAg/MDAxNzIwMzM0MTk0MjAz.GRLFSI66ByerGVPBJmX7nC9WudQCO45VsXUxAvsbEMkg.J6DZpTBwgQMSpyTrunP4wbmZO71ce9oRN3WrLnOUye0g.PNG/1000053454.png", firstLiveDate: "2024-02-19 18:03:58", totalLiveHours: 4148, lastMilestone: 4000, cheerCount: 0, followerCount: 52263, color: "mint" },
  { channelId: "475313e6c26639d5763628313b4c130e", channelName: "엘리", channelImageUrl: "https://nng-phinf.pstatic.net/MjAyNTEwMTJfMjQg/MDAxNzYwMjU5MzQwODQw.72r-pbnXpBvoFivvGK9dKk9CAO8aJN5UV6wXejRiiPwg.Oo7lN5-LX4Dd9tETgUqx5UGoHXNKZ55O5Xy6MnaX7-kg.PNG/image.png", firstLiveDate: "2024-01-04 16:26:11", totalLiveHours: 5162, lastMilestone: 5000, cheerCount: 0, followerCount: 58214, color: "coral" },
  { channelId: "17d8605fc37fb5ef49f5f67ae786fe4e", channelName: "에리스", channelImageUrl: "https://nng-phinf.pstatic.net/MjAyNDA3MTFfMjU1/MDAxNzIwNjYzNjYzMzE2.6ViLvn07CoW0FgG0DVAifAaDyRibcvuJ7Wf80lcaedog.h9LXAMib3NNk7EtCJYbHOB1fMpzdQ49Q9At7b3MnuMUg.PNG/0E954B06-FA2A-4A12-ADFE-36CFA1F6CED7-1720663663.png", firstLiveDate: "2024-02-07 22:00:56", totalLiveHours: 3542, lastMilestone: 3000, cheerCount: 0, followerCount: 48426, color: "cream" },
  { channelId: "a67b328bcc8eea4451ccfa754bc19ae1", channelName: "달콤레나 씨", channelImageUrl: "https://nng-phinf.pstatic.net/MjAyNjA0MDlfMTI3/MDAxNzc1NjY1MDY5ODU0.rkFJkjnyXc5nB7zU5bDPc_2hW2u-jAYL1JUQK5PI1xkg.BjDG3LUVSiASGTM4VaH0US6R7RpyvNmzqz9Eh88dUEcg.PNG/image.png", firstLiveDate: "2024-01-17 22:25:35", totalLiveHours: 6501, lastMilestone: 6000, cheerCount: 0, followerCount: 91596, color: "lime" },
  { channelId: "a3ceb9179d99be8d1e63b3e911fcd16b", channelName: "키유 Kiyuu", channelImageUrl: "https://nng-phinf.pstatic.net/MjAyNjAyMjJfMjQ1/MDAxNzcxNzM5Mjg0Nzg4.fLrTzHmKPaZhzvwyz08SB6b8nCL5hGQh2V_3-014DJMg.QMpmPJAtgz9dj357T3hO-gNru9xgKq8g7i-wnF581dUg.PNG/image.png", firstLiveDate: "2025-11-29 14:50:46", totalLiveHours: 1277, lastMilestone: 1000, cheerCount: 0, followerCount: 15899, color: "mint" },
  { channelId: "088973112d8acc831ec20274f7ffbb99", channelName: "미하루 Miharu", channelImageUrl: "https://nng-phinf.pstatic.net/MjAyNjAxMTFfMTAy/MDAxNzY4MTEyMzUyOTcx.D51vALyJMK9hGdWdzpe2NgKsyggBWJJNaKdPzh_IwKAg.7UeLbx2mM3XLtHRfbuDKwUEuvefqOXMvHX4yFwStH8og.PNG/image.png", firstLiveDate: "2025-11-29 15:55:01", totalLiveHours: 546, lastMilestone: 0, cheerCount: 0, followerCount: 11555, color: "lilac" },
  { channelId: "c8adce2ff4a3618931e07c327e1fa070", channelName: "포키쨩", channelImageUrl: "https://nng-phinf.pstatic.net/MjAyNjAxMDNfMTk1/MDAxNzY3MzcwNDg2MTYy.0vTyLJqAtowVc-UjM2qzofBBv002OUQPyp05BrSPkiog.MEZvrdc9v88N0fsEVynHsBsnh1xxI27zRspK0vZm0VEg.PNG/image.png", firstLiveDate: "2024-01-08 18:57:26", totalLiveHours: 8246, lastMilestone: 8000, cheerCount: 0, followerCount: 27870, color: "pink" },
  { channelId: "6ccaebc2569f62344c6fc257f8f2b9ad", channelName: "엘시v", channelImageUrl: "https://nng-phinf.pstatic.net/MjAyNjAyMDJfMiAg/MDAxNzcwMDQxMDA5OTE5.iGpluslDPntIraPLS-CPaAVfw1HFmUffcPq3bkaBXoMg.xueJx_wx_l-wFoUsW_2VCgw4JrA_Vtsz7qJUO1LmHqkg.PNG/image.png", firstLiveDate: "2025-07-18 20:02:57", totalLiveHours: 1569, lastMilestone: 1000, cheerCount: 0, followerCount: 37648, color: "coral" },
];

export const revalidate = 0; // Disable server caching to ensure users always see freshly scraped hours

export default async function Home() {
  let streamers = [];
  let milestones = [];

  try {
    // Attempt to fetch from Vercel KV
    for (const fallback of FALLBACK_STREAMERS) {
      const cid = fallback.channelId;
      const data: any = await kv.hgetall(`streamer:${cid}`);
      const history: any = (await kv.get(`streamer:${cid}:history`)) || [
        { date: "2026-05-18", hours: fallback.totalLiveHours - 4, followers: (fallback.followerCount || 10000) - 15 },
        { date: "2026-05-19", hours: fallback.totalLiveHours - 2, followers: (fallback.followerCount || 10000) - 5 },
        { date: "2026-05-20", hours: fallback.totalLiveHours, followers: fallback.followerCount || 10000 }
      ];

      if (data) {
        let imageUrl = data.channelImageUrl || fallback.channelImageUrl;
        // Self-healing: If Elsy accidentally has Kiyuu's image URL cached in database, heal it
        if (cid === "6ccaebc2569f62344c6fc257f8f2b9ad" && imageUrl.includes("MjAyNjAyMjJfMjQ1")) {
          imageUrl = fallback.channelImageUrl;
          kv.hset(`streamer:${cid}`, { ...data, channelImageUrl: fallback.channelImageUrl }).catch((e) => {
            console.warn("Failed to self-heal Elsy's image in KV (home):", e);
          });
        }

        streamers.push({
          channelId: cid,
          channelName: data.channelName || fallback.channelName,
          channelImageUrl: imageUrl,
          firstLiveDate: data.firstLiveDate || fallback.firstLiveDate,
          totalLiveHours: Number(data.totalLiveHours) || fallback.totalLiveHours,
          lastMilestone: Number(data.lastMilestone) || fallback.lastMilestone,
          cheerCount: Number(data.cheerCount) || 0,
          followerCount: Number(data.followerCount) || fallback.followerCount || 0,
          color: data.color || fallback.color,
          lastUpdated: data.lastUpdated || new Date().toISOString(),
          history,
        });
      } else {
        streamers.push({
          ...fallback,
          history,
          lastUpdated: new Date().toISOString(),
        });
      }
    }

    const milestoneRecords: any[] = await kv.lrange("milestones", 0, 49);
    milestones = milestoneRecords.map((m) => {
      try {
        const parsed = typeof m === "string" ? JSON.parse(m) : m;
        if (!parsed.type) parsed.type = "hours"; // Backwards compatibility
        return parsed;
      } catch {
        return m;
      }
    });

    if (milestones.length === 0) {
      milestones = [
        { channelId: "4de764d9dad3b25602284be6db3ac647", channelName: "아리사", milestone: 7000, type: "hours", date: "2026-05-10T12:00:00.000Z" },
        { channelId: "4de764d9dad3b25602284be6db3ac647", channelName: "아리사", milestone: 90000, type: "followers", date: "2026-05-09T18:00:00.000Z" },
        { channelId: "65c3035bdc598c81f15a8fe0e958b3ce", channelName: "초승달", milestone: 60000, type: "followers", date: "2026-05-08T14:30:00.000Z" },
        { channelId: "a67b328bcc8eea4451ccfa754bc19ae1", channelName: "달콤레나 씨", milestone: 6000, type: "hours", date: "2026-05-02T10:00:00.000Z" },
        { channelId: "475313e6c26639d5763628313b4c130e", channelName: "엘리", milestone: 50000, type: "followers", date: "2026-04-25T11:00:00.000Z" },
        { channelId: "475313e6c26639d5763628313b4c130e", channelName: "엘리", milestone: 5000, type: "hours", date: "2026-04-20T15:00:00.000Z" },
        { channelId: "65c3035bdc598c81f15a8fe0e958b3ce", channelName: "초승달", milestone: 4000, type: "hours", date: "2026-04-15T09:00:00.000Z" }
      ];
    }
  } catch (err) {
    console.warn("Vercel KV not connected or failed. Serving mock/fallback data:", err);
    // Serve fallback mockup stats in case environment variables are missing
    streamers = FALLBACK_STREAMERS.map(f => ({
      ...f,
      lastUpdated: new Date().toISOString(),
      history: [
        { date: "2026-05-18", hours: f.totalLiveHours - 4, followers: (f.followerCount || 10000) - 15 },
        { date: "2026-05-19", hours: f.totalLiveHours - 2, followers: (f.followerCount || 10000) - 5 },
        { date: "2026-05-20", hours: f.totalLiveHours, followers: f.followerCount || 10000 }
      ]
    }));
    milestones = [
      { channelId: "4de764d9dad3b25602284be6db3ac647", channelName: "아리사", milestone: 7000, type: "hours", date: "2026-05-10T12:00:00.000Z" },
      { channelId: "4de764d9dad3b25602284be6db3ac647", channelName: "아리사", milestone: 90000, type: "followers", date: "2026-05-09T18:00:00.000Z" },
      { channelId: "65c3035bdc598c81f15a8fe0e958b3ce", channelName: "초승달", milestone: 60000, type: "followers", date: "2026-05-08T14:30:00.000Z" },
      { channelId: "a67b328bcc8eea4451ccfa754bc19ae1", channelName: "달콤레나 씨", milestone: 6000, type: "hours", date: "2026-05-02T10:00:00.000Z" },
      { channelId: "475313e6c26639d5763628313b4c130e", channelName: "엘리", milestone: 50000, type: "followers", date: "2026-04-25T11:00:00.000Z" },
      { channelId: "475313e6c26639d5763628313b4c130e", channelName: "엘리", milestone: 5000, type: "hours", date: "2026-04-20T15:00:00.000Z" },
      { channelId: "65c3035bdc598c81f15a8fe0e958b3ce", channelName: "초승달", milestone: 4000, type: "hours", date: "2026-04-15T09:00:00.000Z" }
    ];
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Figma Top Nav Chrome */}
      <header className="sticky top-0 z-50 bg-white border-b border-hairline h-[56px] flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <span className="font-mono text-[12px] font-bold tracking-mono uppercase">CHZZK MILESTONE</span>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="https://chzzk.naver.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden md:inline-flex items-center h-[36px] px-4 rounded-full bg-white text-black text-[14px] font-medium border border-hairline hover:bg-neutral-50 transition-colors"
          >
            치지직 바로가기
          </a>
          <a
            href="#dashboard"
            className="inline-flex items-center justify-center h-[36px] px-5 rounded-full bg-black text-white text-[14px] font-medium hover:bg-neutral-900 transition-colors"
          >
            대시보드 보기
          </a>
        </div>
      </header>

      {/* Main Interactive App Dashboard - Background handled elegantly inside ClientDashboard */}
      <main id="dashboard" className="flex-1 bg-white">
        <ClientDashboard initialStreamers={streamers} initialMilestones={milestones} />
      </main>

      {/* Editorial Figma Footer */}
      <footer className="bg-black text-white py-[96px] px-6 border-t border-neutral-900 mt-auto">
        <div className="max-w-[1280px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-12">
          <div className="md:col-span-2">
            <span className="font-sans text-[24px] font-bold tracking-display-lg block mb-4">
              CHZZK MILESTONE
            </span>
            <p className="font-sans text-[14px] text-neutral-400 max-w-[500px] leading-relaxed">
              본 트래커는 네이버 치지직의 공식 서비스가 아니며, 크리에이터들의 활발한 방송 활동을 응원하고 팬들이 돌파 기록을 축하하기 위해 제작된 팬 메이드 프로젝트입니다.
            </p>
          </div>
          <div>
            <span className="font-mono text-[12px] font-bold tracking-mono uppercase text-neutral-400 block mb-6">
              DATA SOURCES
            </span>
            <ul className="space-y-3 text-[14px] text-neutral-400 font-sans">
              <li>
                <a
                  href="https://api.chzzk.naver.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors"
                >
                  Naver Chzzk Open/Internal API
                </a>
              </li>
              <li>
                <span className="text-neutral-500">Auto Scraped Daily</span>
              </li>
            </ul>
          </div>
        </div>
        <div className="max-w-[1280px] mx-auto border-t border-neutral-900 mt-16 pt-8 flex flex-col md:flex-row items-center justify-between text-[12px] text-neutral-500">
          <span>&copy; 2026 Chzzk Milestone Tracker. Dedicated with love.</span>
          <span className="mt-4 md:mt-0 font-mono tracking-mono uppercase">
            DESIGN ADOPTED FROM FIGMA MARKETING FRAMEWORK
          </span>
        </div>
      </footer>
    </div>
  );
}
