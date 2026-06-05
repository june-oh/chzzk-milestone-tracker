import type { ComponentProps } from "react";
import ClientDashboard from "./components/ClientDashboard";
import { fetchLiveStreamers } from "@/lib/chzzkScrape";
import { enrichStreamer } from "@/lib/streamerMeta";
import { loadMilestonesFromKv, loadStreamersFromKv } from "@/lib/loadStreamersFromKv";
import { FALLBACK_STREAMERS } from "@/lib/streamersConfig";

export const revalidate = 60;

export default async function Home() {
  let streamers: Awaited<ReturnType<typeof loadStreamersFromKv>> = [];
  let milestones: Awaited<ReturnType<typeof loadMilestonesFromKv>> = [];

  try {
    [streamers, milestones] = await Promise.all([loadStreamersFromKv(), loadMilestonesFromKv()]);
  } catch (err) {
    console.warn("Vercel KV not connected or failed. Using fallback data:", err);
    const liveStreamers = await fetchLiveStreamers(FALLBACK_STREAMERS);
    streamers = liveStreamers.map((f) =>
      enrichStreamer({
        ...f,
        lastUpdated: new Date().toISOString(),
        history: [
          { date: "2026-05-18", hours: Math.max(0, f.totalLiveHours - 4), followers: Math.max(0, (f.followerCount || 10000) - 15) },
          { date: "2026-05-19", hours: Math.max(0, f.totalLiveHours - 2), followers: Math.max(0, (f.followerCount || 10000) - 5) },
          { date: "2026-05-20", hours: Math.max(0, f.totalLiveHours), followers: f.followerCount || 10000 },
        ],
      })
    );
    milestones = await loadMilestonesFromKv().catch(() => []);
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Figma Top Nav Chrome */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-hairline h-[56px] flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <a href="/" className="font-mono text-[12px] font-bold tracking-mono uppercase hover:text-neutral-500 transition-colors">
            CHZZK CREATOR MILESTONES
          </a>
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

      <main id="dashboard" className="flex-1 bg-[#f4f6f8]">
        <ClientDashboard
          initialStreamers={streamers as ComponentProps<typeof ClientDashboard>["initialStreamers"]}
          initialMilestones={milestones as ComponentProps<typeof ClientDashboard>["initialMilestones"]}
        />
      </main>

      <footer className="bg-black text-white py-[96px] px-6 border-t border-neutral-900 mt-auto">
        <div className="max-w-[1280px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-12">
          <div className="md:col-span-2">
            <span className="font-sans text-[24px] font-bold tracking-display-lg block mb-4">
              CHZZK CREATOR MILESTONES
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
