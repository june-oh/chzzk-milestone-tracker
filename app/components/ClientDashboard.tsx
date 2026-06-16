"use client";

import { useState, useEffect, useMemo, useRef, type ReactNode } from "react";
import confetti from "canvas-confetti";
import Image from "next/image";
import { Sparkles, Trophy, Calendar, Heart, Flame, ArrowRight, RotateCcw, ExternalLink, X, TrendingUp, ChevronLeft, Users, Check, ArrowDown, ArrowUp } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ReferenceDot, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  getDebutReferenceDate,
  getNamuwikiUrl,
  getStreamerBirthday,
  formatBirthdayLabel,
  hasNamuwikiProfile,
} from "@/lib/namuwikiProfiles";
import {
  getGroupTag,
  GROUP_FILTER_ORDER,
  getManualCumulativeHoursHistory,
  getManualFollowerHistory,
  getBroadcastActivityBars,
  getArchivedFollowerMilestoneDate,
  getArchivedHoursMilestoneDate,
  hasBroadcastActivityData,
  hasArchivedFollowerHistory,
  hasArchivedHoursHistory,
  resolveBroadcastActivityEndDay,
  sanitizeFollowerHistoryForChart,
  sanitizeHoursHistoryForChart,
  type BroadcastActivityRange,
} from "@/lib/streamerMeta";
import type { GroupTag } from "@/lib/streamerMeta";
import { resolveCardPalette, getGlassCardStyle, type CardSurfacePalette as GlassPalette } from "@/lib/cardPaletteUtils";
import { getVerifiedNamuwikiThemePalette, hasVerifiedNamuwikiTheme } from "@/lib/namuwikiThemeColors";
import { getBundledImageThemePalette } from "@/lib/imageThemeColors";
import { formatDebutDPlus, formatDebutElapsed, getNextCommemorativeEvent } from "@/lib/debutElapsed";
import StatCounter from "./StatCounter";

interface StreamerHistory {
  date: string;
  hours: number;
  followers?: number;
}

interface Streamer {
  channelId: string;
  channelName: string;
  channelImageUrl: string;
  firstLiveDate: string;
  totalLiveHours: number;
  lastMilestone: number;
  cheerCount: number;
  followerCount?: number;
  groupTag?: GroupTag;
  color: string;
  cardBg?: string;
  cardBorder?: string;
  accentHex?: string;
  lastUpdated: string;
  history: StreamerHistory[];
}

interface Milestone {
  channelId: string;
  channelName: string;
  channelImageUrl?: string;
  milestone: number;
  type?: "hours" | "followers";
  date: string;
}

interface ClientDashboardProps {
  initialStreamers: Streamer[];
  initialMilestones: Milestone[];
}

type HoursChartPoint = {
  x: number;
  y: number;
  raw: { date: Date; hours: number; label: string; isMilestone: boolean };
};

type FollowersChartPoint = {
  x: number;
  y: number;
  raw: { date: Date; followers: number; label: string; isMilestone: boolean };
};

type HoverChartPoint = HoursChartPoint | FollowersChartPoint;

type NumericLinePoint = {
  timestamp: number;
  [key: string]: number | string | boolean | null;
};

type ChartMarkerTooltip = {
  x: number;
  y: number;
  label: string;
  fullDate: string;
  color: string;
} | null;

const COLOR_MAP: Record<string, { bg: string; accent: string; text: string; rawHex: string }> = {
  lilac: { bg: "bg-[#f4ebff]", accent: "bg-[#a46cfc]", text: "text-[#692ec7]", rawHex: "#a46cfc" },
  pink: { bg: "bg-[#ffebeb]", accent: "bg-[#ff6c8f]", text: "text-[#d61c4e]", rawHex: "#ff6c8f" },
  mint: { bg: "bg-[#e1fbf4]", accent: "bg-[#10b981]", text: "text-[#047857]", rawHex: "#10b981" },
  coral: { bg: "bg-[#fff0eb]", accent: "bg-[#ff7a59]", text: "text-[#c2410c]", rawHex: "#ff7a59" },
  cream: { bg: "bg-[#fffbf0]", accent: "bg-[#fbbf24]", text: "text-[#b45309]", rawHex: "#fbbf24" },
  lime: { bg: "bg-[#e2fc52]/10", accent: "bg-[#e2fc52]", text: "text-[#4d5d03]", rawHex: "#b5db00" }, // Special style for signature figma lime
};

type CardSortField = "hours" | "followers" | "debut" | null;
type CardSortDir = "asc" | "desc";

type CardSurfacePalette = GlassPalette;

function getCardSurfacePalette(
  streamer: Streamer,
  extractedPalettes: Record<string, CardSurfacePalette>
): CardSurfacePalette {
  const colorSet = COLOR_MAP[streamer.color] || COLOR_MAP.lime;
  return resolveCardPalette({
    verifiedNamuwiki: getVerifiedNamuwikiThemePalette(streamer.channelId),
    bundledImage: getBundledImageThemePalette(streamer.channelId),
    cardBg: streamer.cardBg,
    cardBorder: streamer.cardBorder,
    extracted: extractedPalettes[streamer.channelId] ?? null,
    fallbackHex: colorSet.rawHex,
  });
}

function getStreamerAccentHex(
  streamer: Streamer,
  extractedPalettes: Record<string, CardSurfacePalette>
): string {
  return (
    getCardSurfacePalette(streamer, extractedPalettes).accentHex ??
    (COLOR_MAP[streamer.color] || COLOR_MAP.lime).rawHex
  );
}

function StreamerChannelImage({
  src,
  alt,
  variant = "card",
  className = "",
}: {
  src: string;
  alt: string;
  variant?: "card" | "avatar" | "thumb";
  className?: string;
}) {
  const objectClass =
    variant === "avatar"
      ? "object-cover object-[center_22%]"
      : variant === "thumb"
        ? "object-cover object-[center_20%]"
        : "object-cover object-[center_22%]";

  const pixelSize =
    variant === "avatar" ? 44 : variant === "thumb" ? 84 : 132;

  return (
    <Image
      src={src}
      alt={alt}
      width={pixelSize}
      height={pixelSize}
      quality={90}
      className={`block h-full w-full rounded-full ${objectClass} ${className}`}
      unoptimized={!src.includes("pstatic.net")}
    />
  );
}

const BORDER_COLOR_MAP: Record<string, string> = {
  lilac: "border-[#e6d6ff]",
  pink: "border-[#ffd4d4]",
  mint: "border-[#c4f4e4]",
  coral: "border-[#ffe0d4]",
  cream: "border-[#fef0c7]",
  lime: "border-[#e2fc52]/30",
};

const parseSafeDate = (dateStr: string | Date | undefined): Date => {
  if (!dateStr) return new Date();
  if (dateStr instanceof Date) return dateStr;
  
  let formatted = dateStr.trim();
  if (formatted.includes(" ") && !formatted.includes("T")) {
    formatted = formatted.replace(" ", "T");
  }
  const d = new Date(formatted);
  if (isNaN(d.getTime())) {
    try {
      const parts = dateStr.match(/\d+/g);
      if (parts && parts.length >= 3) {
        const year = parseInt(parts[0]);
        const month = parseInt(parts[1]) - 1;
        const day = parseInt(parts[2]);
        const hour = parts[3] ? parseInt(parts[3]) : 0;
        const minute = parts[4] ? parseInt(parts[4]) : 0;
        const second = parts[5] ? parseInt(parts[5]) : 0;
        return new Date(year, month, day, hour, minute, second);
      }
    } catch {
      return new Date();
    }
    return new Date();
  }
  return d;
};

const parseHistoryDate = (dateStr: string | Date | undefined): Date => {
  const d = parseSafeDate(dateStr);
  if (typeof dateStr === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    d.setHours(23, 59, 59, 999);
  }
  return d;
};

const getHoursChartScale = (totalHours: number, dataPeak = 0) => {
  const peak = Math.max(totalHours, dataPeak, 1);
  if (peak < 1000) {
    const max = Math.max(100, Math.ceil((peak * 1.15) / 50) * 50);
    const step = max <= 300 ? 50 : max <= 600 ? 100 : 200;
    const ticks: number[] = [];
    for (let value = 0; value <= max; value += step) {
      ticks.push(value);
    }
    if (ticks[ticks.length - 1] !== max) {
      ticks.push(max);
    }
    return { max, ticks };
  }

  const max = Math.ceil((peak + 1) / 1000) * 1000;
  const ticks = Array.from({ length: Math.floor(max / 1000) + 1 }, (_, index) => index * 1000);
  return { max, ticks };
};

const GROUP_TAG_STYLES: Record<GroupTag, string> = {
  CLUEZ: "bg-[#fff7ed] text-[#c2410c] border-[#fed7aa]",
  ENCHANT: "bg-[#f5f3ff] text-[#7c3aed] border-[#ddd6fe]",
  Planeta: "bg-[#fffbf0] text-[#b45309] border-[#fef0c7]",
  Honeyz: "bg-[#fff8e7] text-[#a16207] border-[#fde68a]",
  AESTHER: "bg-[#ffebeb] text-[#d61c4e] border-[#ffd4d4]",
  ACAXIA: "bg-[#f5f0ff] text-[#7c3aed] border-[#ddd6fe]",
  Listella: "bg-[#fff1f2] text-[#e11d48] border-[#fecdd3]",
  StelLive: "bg-[#eff6ff] text-[#2563eb] border-[#bfdbfe]",
  OverTheWall: "bg-[#ecfeff] text-[#0e7490] border-[#a5f3fc]",
};

const renderGroupTag = (tag?: GroupTag) => {
  if (!tag) return null;

  const styles = GROUP_TAG_STYLES[tag];

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-mono uppercase border ${styles}`}
    >
      {tag}
    </span>
  );
};

const projectMilestoneTimestamp = (
  lineData: NumericLinePoint[],
  valueKey: "hours" | "followers",
  milestone: number
) => {
  const sorted = [...lineData].sort((a, b) => a.timestamp - b.timestamp);

  for (let i = 1; i < sorted.length; i++) {
    const previous = sorted[i - 1];
    const current = sorted[i];
    const previousValue = Number(previous[valueKey]);
    const currentValue = Number(current[valueKey]);

    if (
      Number.isFinite(previousValue) &&
      Number.isFinite(currentValue) &&
      previousValue <= milestone &&
      milestone <= currentValue &&
      currentValue > previousValue
    ) {
      const ratio = (milestone - previousValue) / (currentValue - previousValue);
      return previous.timestamp + (current.timestamp - previous.timestamp) * ratio;
    }
  }

  return null;
};

export default function ClientDashboard({ initialStreamers, initialMilestones }: ClientDashboardProps) {
  const [streamers, setStreamers] = useState<Streamer[]>(initialStreamers);
  const [milestones, setMilestones] = useState<Milestone[]>(initialMilestones);
  const [activeStreamerId, setActiveStreamerId] = useState<string | null>(null);
  const [selectedForCompare, setSelectedForCompare] = useState<Set<string>>(new Set());
  const [compareHeaderView, setCompareHeaderView] = useState(false);
  const [cardSortField, setCardSortField] = useState<CardSortField>(null);
  const [cardSortDir, setCardSortDir] = useState<CardSortDir>("desc");
  const [selectedGroupFilters, setSelectedGroupFilters] = useState<Set<GroupTag>>(() => new Set());
  const [extractedPalettes, setExtractedPalettes] = useState<Record<string, CardSurfacePalette>>({});
  const fetchedPaletteIds = useRef(new Set<string>());
  const [hoveredHoursPointState, setHoveredHoursPoint] = useState<HoursChartPoint | null>(null);
  const [hoveredFollowersPointState, setHoveredFollowersPoint] = useState<FollowersChartPoint | null>(null);
  const [chartMarkerTooltip, setChartMarkerTooltip] = useState<ChartMarkerTooltip>(null);
  const [broadcastActivityRange, setBroadcastActivityRange] = useState<BroadcastActivityRange>("7d");
  const hoveredHoursPoint = hoveredHoursPointState ?? {
    x: 0,
    y: 0,
    raw: { date: new Date(), hours: 0, label: "", isMilestone: false },
  };
  const hoveredFollowersPoint = hoveredFollowersPointState ?? {
    x: 0,
    y: 0,
    raw: { date: new Date(), followers: 0, label: "", isMilestone: false },
  };

  const formatDateFull = (dateStr: string | Date) => {
    try {
      const d = parseSafeDate(dateStr);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    } catch {
      return "";
    }
  };

  const handleMouseMove = (
    e: React.MouseEvent<SVGSVGElement, MouseEvent>,
    points: HoverChartPoint[],
    type: "hours" | "followers"
  ) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * 800;

    let closestPoint: HoverChartPoint | null = null;
    let minDistance = Infinity;

    for (const p of points) {
      const distance = Math.abs(p.x - mouseX);
      if (distance < minDistance) {
        minDistance = distance;
        closestPoint = p;
      }
    }

    if (closestPoint) {
      if (type === "hours") {
        setHoveredHoursPoint(closestPoint as HoursChartPoint);
      } else {
        setHoveredFollowersPoint(closestPoint as FollowersChartPoint);
      }
    }
  };

  // Sync state with browser's Back/Forward buttons and URL query params
  useEffect(() => {
    // 1. Initial Load: Check if there's a ?streamer=xxx parameter in the URL
    const params = new URLSearchParams(window.location.search);
    const initialCid = params.get("streamer");
    if (initialCid) {
      const exists = initialStreamers.some((s) => s.channelId === initialCid);
      if (exists) {
        setActiveStreamerId(initialCid);
      }
    }

    // 2. Listen to browser Back / Forward buttons (popstate event)
    const handlePopState = (event: PopStateEvent) => {
      const popParams = new URLSearchParams(window.location.search);
      const streamerCid = popParams.get("streamer");
      setActiveStreamerId(streamerCid);
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [initialStreamers]);

  // Resolve milestone dates for dashboard lists: prefer archived/cron records, estimate only as last resort.
  const resolveMilestoneDateAndStatus = (log: Milestone) => {
    const type = log.type || "hours";

    const verifiedMilestones = [
      { channelId: "4de764d9dad3b25602284be6db3ac647", milestone: 7000, type: "hours", date: "2026-05-10T12:00:00.000Z" },
      { channelId: "4de764d9dad3b25602284be6db3ac647", milestone: 90000, type: "followers", date: "2026-05-09T18:00:00.000Z" },
      { channelId: "65c3035bdc598c81f15a8fe0e958b3ce", milestone: 60000, type: "followers", date: "2025-06-02T12:00:00.000Z" },
      { channelId: "65c3035bdc598c81f15a8fe0e958b3ce", milestone: 50000, type: "followers", date: "2025-01-12T12:00:00.000Z" },
      { channelId: "65c3035bdc598c81f15a8fe0e958b3ce", milestone: 30000, type: "followers", date: "2024-04-21T12:00:00.000Z" },
      { channelId: "65c3035bdc598c81f15a8fe0e958b3ce", milestone: 10000, type: "followers", date: "2024-02-28T12:00:00.000Z" },
      { channelId: "a67b328bcc8eea4451ccfa754bc19ae1", milestone: 6000, type: "hours", date: "2026-05-02T10:00:00.000Z" },
      { channelId: "475313e6c26639d5763628313b4c130e", milestone: 50000, type: "followers", date: "2026-04-25T11:00:00.000Z" },
      { channelId: "475313e6c26639d5763628313b4c130e", milestone: 10000, type: "followers", date: "2024-02-21T12:00:00.000Z" },
      { channelId: "475313e6c26639d5763628313b4c130e", milestone: 5000, type: "hours", date: "2026-04-20T15:00:00.000Z" },
      { channelId: "65c3035bdc598c81f15a8fe0e958b3ce", milestone: 4000, type: "hours", date: "2026-04-15T09:00:00.000Z" },
    ];

    const verified = verifiedMilestones.find(
      (v) => v.channelId === log.channelId && v.milestone === log.milestone && v.type === type
    );
    if (verified) {
      return { date: verified.date, isEstimated: false };
    }

    const matchingStreamer = streamers.find((s) => s.channelId === log.channelId);
    const debutRef = matchingStreamer
      ? getDebutReferenceDate(matchingStreamer.channelId, matchingStreamer.firstLiveDate) ?? undefined
      : undefined;

    const archivedDate =
      type === "hours"
        ? getArchivedHoursMilestoneDate(
            log.channelId,
            log.milestone,
            matchingStreamer?.totalLiveHours,
            debutRef
          )
        : getArchivedFollowerMilestoneDate(log.channelId, log.milestone);
    if (archivedDate) {
      return { date: archivedDate, isEstimated: false };
    }

    if (log.date) {
      return { date: log.date, isEstimated: false };
    }

    if (!matchingStreamer) {
      return { date: log.date, isEstimated: false };
    }

    const hasCollectedHistory =
      type === "hours"
        ? hasArchivedHoursHistory(log.channelId)
        : hasArchivedFollowerHistory(log.channelId);
    if (hasCollectedHistory) {
      return { date: log.date, isEstimated: false };
    }

    // No recorded date — estimate using linear interpolation from debut reference
    try {
      if (!debutRef) throw new Error("no debut reference");
      const startDate = parseSafeDate(debutRef);
      const endDate = parseSafeDate(matchingStreamer.lastUpdated || new Date().toISOString());

      if (type === "hours") {
        const totalHours = matchingStreamer.totalLiveHours;
        if (totalHours > 0) {
          const timeSpan = endDate.getTime() - startDate.getTime();
          const msPerHour = timeSpan / totalHours;
          const estimatedMs = startDate.getTime() + log.milestone * msPerHour;
          return { date: new Date(estimatedMs).toISOString(), isEstimated: true };
        }
      } else {
        const totalFollowers = matchingStreamer.followerCount || 0;
        if (totalFollowers > 0) {
          const timeSpan = endDate.getTime() - startDate.getTime();
          const msPerFollower = timeSpan / totalFollowers;
          const estimatedMs = startDate.getTime() + log.milestone * msPerFollower;
          return { date: new Date(estimatedMs).toISOString(), isEstimated: true };
        }
      }
    } catch (err) {
      console.warn("Milestone estimation on dashboard failed:", err);
    }

    return { date: log.date, isEstimated: false };
  };

  // Handle setting active streamer with HTML5 pushState to create history entries
  const handleSelectStreamer = (cid: string | null) => {
    const params = new URLSearchParams(window.location.search);
    
    if (cid) {
      params.set("streamer", cid);
      window.history.pushState({ streamer: cid }, "", `?${params.toString()}`);
    } else {
      params.delete("streamer");
      window.history.pushState({}, "", window.location.pathname);
    }
    
    setActiveStreamerId(cid);
  };

  // Automatically scroll to the dashboard section when the active streamer changes
  useEffect(() => {
    if (activeStreamerId) {
      const element = document.getElementById("dashboard");
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    }
  }, [activeStreamerId]);

  useEffect(() => {
    setBroadcastActivityRange("7d");
  }, [activeStreamerId]);

  // Deferred background refresh — SSR data renders first, API sync after paint
  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch("/api/streamers");
        const data = await res.json();
        if (active && data.success) {
          if (data.streamers) setStreamers(data.streamers);
          if (data.milestones) setMilestones(data.milestones);
        }
      } catch (err) {
        console.error("Failed to load latest streamer data:", err);
      }
    }, 5000);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, []);

  const paletteFetchKey = useMemo(
    () => initialStreamers.map((streamer) => `${streamer.channelId}:${streamer.channelImageUrl}`).join("|"),
    [initialStreamers]
  );

  useEffect(() => {
    let cancelled = false;

    async function fillProfilePalettes() {
      await new Promise((resolve) => window.setTimeout(resolve, 300));
      if (cancelled) return;

      const targets = initialStreamers.filter(
        (streamer) =>
          streamer.channelImageUrl &&
          !fetchedPaletteIds.current.has(streamer.channelId) &&
          !hasVerifiedNamuwikiTheme(streamer.channelId) &&
          !getBundledImageThemePalette(streamer.channelId)
      );
      if (targets.length === 0) return;

      const batchSize = 4;

      for (let i = 0; i < targets.length; i += batchSize) {
        if (cancelled) break;

        const batch = targets.slice(i, i + batchSize);
        const batchResults = await Promise.all(
          batch.map(async (streamer) => {
            try {
              const res = await fetch(`/api/image-palette?url=${encodeURIComponent(streamer.channelImageUrl)}`);
              if (!res.ok) return null;
              const data = await res.json();
              if (!data.success || !data.cardBg || !data.cardBorder) return null;
              return {
                channelId: streamer.channelId,
                cardBg: data.cardBg as string,
                cardBorder: data.cardBorder as string,
                accentHex: data.accentHex as string | undefined,
                accentRgb: data.accentRgb as string | undefined,
              };
            } catch {
              return null;
            }
          })
        );

        const nextEntries = batchResults.filter(Boolean) as Array<CardSurfacePalette & { channelId: string }>;
        if (nextEntries.length === 0) continue;

        nextEntries.forEach((entry) => fetchedPaletteIds.current.add(entry.channelId));

        setExtractedPalettes((prev) => {
          const next = { ...prev };
          nextEntries.forEach((entry) => {
            next[entry.channelId] = {
              cardBg: entry.cardBg,
              cardBorder: entry.cardBorder,
              accentHex: entry.accentHex,
              accentRgb: entry.accentRgb,
            };
          });
          return next;
        });
      }
    }

    fillProfilePalettes();

    return () => {
      cancelled = true;
    };
  }, [paletteFetchKey, initialStreamers]);

  // Compute milestone variables
  const getMilestoneStats = (hours: number) => {
    const nextMilestone = Math.ceil((hours + 0.1) / 1000) * 1000;
    const progressPercent = ((hours % 1000) / 1000) * 100;
    const hoursRemaining = nextMilestone - hours;
    return { nextMilestone, progressPercent, hoursRemaining };
  };

  const getFollowerMilestoneStats = (followers = 0) => {
    const nextMilestone = Math.ceil((followers + 0.1) / 10000) * 10000;
    const prevMilestone = Math.max(nextMilestone - 10000, 0);
    const bandSize = nextMilestone - prevMilestone;
    const progressPercent = bandSize > 0 ? ((followers - prevMilestone) / bandSize) * 100 : 0;
    const followersRemaining = nextMilestone - followers;
    const bandRemainingPercent = bandSize > 0 ? (followersRemaining / bandSize) * 100 : 0;
    // Higher milestones (e.g. 30만) weigh more than early ones (e.g. 2만) so large channels do not dominate.
    const tierWeight = Math.sqrt(nextMilestone / 10000);
    const weightedRemainingScore = followersRemaining * tierWeight;
    const weightedRemainingPercent = bandRemainingPercent * tierWeight;
    return {
      nextMilestone,
      prevMilestone,
      progressPercent,
      followersRemaining,
      bandRemainingPercent,
      weightedRemainingScore,
      weightedRemainingPercent,
    };
  };

  const getLastFollowerMilestone = (followers = 0) => {
    if (followers < 10000) return 0;
    return Math.floor(followers / 10000) * 10000;
  };

  const formatFollowerMilestoneTarget = (milestone: number) => {
    if (milestone >= 10000) {
      return `${milestone / 10000}만명`;
    }
    return `${milestone.toLocaleString()}명`;
  };

  const renderCardMilestoneBadges = (streamer: Streamer) => {
    const lastFollowerClub = getLastFollowerMilestone(streamer.followerCount || 0);

    return (
      <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 pointer-events-none">
        {streamer.lastMilestone > 0 && (
          <span className="inline-flex items-center gap-1 bg-white/92 text-black px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[9px] sm:text-[10px] font-bold font-mono tracking-mono border border-black/10 shadow-sm">
            <Trophy className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-yellow-500 shrink-0" />
            <span>{streamer.lastMilestone.toLocaleString()}H</span>
          </span>
        )}
        {lastFollowerClub > 0 && (
          <span className="inline-flex items-center gap-1 bg-white/92 text-black px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[9px] sm:text-[10px] font-bold font-mono tracking-mono border border-black/10 shadow-sm">
            <Users className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-indigo-500 shrink-0" />
            <span>{formatFollowerMilestoneTarget(lastFollowerClub)}</span>
          </span>
        )}
      </div>
    );
  };

  const toggleCompareSelection = (channelId: string) => {
    setSelectedForCompare((prev) => {
      const next = new Set(prev);
      if (next.has(channelId)) {
        next.delete(channelId);
      } else {
        next.add(channelId);
      }
      return next;
    });
  };

  const renderStreamerProfileHeader = (streamer: Streamer) => {
    const cardPalette = getCardSurfacePalette(streamer, extractedPalettes);
    const accentHex = getStreamerAccentHex(streamer, extractedPalettes);
    const hoursStats = getMilestoneStats(streamer.totalLiveHours);
    const followerStats = getFollowerMilestoneStats(streamer.followerCount || 0);
    const lastFollowerClub = getLastFollowerMilestone(streamer.followerCount || 0);

    return (
      <div
        className="rounded-[32px] border p-8 md:p-12 shadow-sm relative overflow-hidden glass-card-surface border-white/70"
        style={getGlassCardStyle(cardPalette)}
      >
        <div className="pointer-events-none absolute inset-0 rounded-[inherit] bg-gradient-to-br from-white/18 via-transparent to-white/5" />
        <div className="flex flex-col lg:flex-row items-center lg:items-start justify-between gap-8 relative z-10">
          <div className="flex flex-col md:flex-row items-center gap-6 text-center md:text-left flex-1 min-w-0">
            <div className="relative aspect-square w-[110px] h-[110px] shrink-0 overflow-hidden rounded-full border-4 border-white bg-neutral-100 shadow-lg">
              <StreamerChannelImage src={streamer.channelImageUrl} alt={streamer.channelName} variant="avatar" />
            </div>
            <div className="space-y-3 min-w-0">
              <div className="flex items-center justify-center md:justify-start gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: accentHex }} />
                <span className="font-mono text-[12px] font-bold tracking-mono text-neutral-500 uppercase">
                  CHZZK PARTNER CREATOR
                </span>
              </div>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                <h2 className="font-sans text-[32px] md:text-[36px] font-bold text-black tracking-tight leading-none">
                  {streamer.channelName}
                </h2>
                {renderGroupTag(streamer.groupTag || getGroupTag(streamer.channelId))}
              </div>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 text-[13px] text-neutral-600 font-medium">
                {streamer.firstLiveDate && (
                  <span className="flex items-center gap-1.5" suppressHydrationWarning>
                    <Calendar className="w-4 h-4 text-neutral-400" />
                    방송 시작: {formatDateKorean(streamer.firstLiveDate)}
                  </span>
                )}
                <span className="bg-white/60 px-3 py-1 rounded-full text-[12px] border border-hairline-soft font-bold">
                  🥇 {streamer.lastMilestone.toLocaleString()}H 클럽 가입됨
                </span>
                {lastFollowerClub > 0 && (
                  <span className="bg-white/60 px-3 py-1 rounded-full text-[12px] border border-hairline-soft font-bold flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-neutral-500" />
                    {formatFollowerMilestoneTarget(lastFollowerClub)} 클럽 가입됨
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-[640px] text-left">
                <div className="bg-white/85 border border-hairline-soft rounded-2xl p-4 shadow-sm">
                  <div className="flex justify-between text-[11px] font-mono font-bold tracking-mono text-neutral-500 uppercase mb-1.5">
                    <span>PROGRESS TO {hoursStats.nextMilestone.toLocaleString()}H</span>
                    <span>{hoursStats.progressPercent.toFixed(1)}%</span>
                  </div>
                  <div className="w-full h-3 bg-neutral-200/50 rounded-full overflow-hidden border border-hairline-soft mb-2.5">
                    <div
                      className="h-full transition-all duration-500"
                      style={{ width: `${hoursStats.progressPercent}%`, backgroundColor: accentHex }}
                    />
                  </div>
                  <p className="font-sans text-[12px] text-neutral-800 font-medium leading-snug">
                    다음 <strong className="text-black font-extrabold">{hoursStats.nextMilestone.toLocaleString()}시간</strong>까지{" "}
                    <strong className="text-black font-extrabold">{hoursStats.hoursRemaining.toLocaleString()}시간</strong> 남음
                  </p>
                </div>

                {streamer.followerCount !== undefined && (
                  <div className="bg-white/85 border border-hairline-soft rounded-2xl p-4 shadow-sm">
                    <div className="flex justify-between text-[11px] font-mono font-bold tracking-mono text-neutral-500 uppercase mb-1.5">
                      <span>PROGRESS TO {formatFollowerMilestoneTarget(followerStats.nextMilestone)}</span>
                      <span>{followerStats.progressPercent.toFixed(1)}%</span>
                    </div>
                    <div className="w-full h-3 bg-neutral-200/50 rounded-full overflow-hidden border border-hairline-soft mb-2.5">
                      <div
                        className="h-full bg-indigo-500 transition-all duration-500"
                        style={{ width: `${followerStats.progressPercent}%` }}
                      />
                    </div>
                    <p className="font-sans text-[12px] text-neutral-800 font-medium leading-snug">
                      다음 <strong className="text-black font-extrabold">{formatFollowerMilestoneTarget(followerStats.nextMilestone)}</strong>까지{" "}
                      <strong className="text-black font-extrabold">{followerStats.followersRemaining.toLocaleString()}명</strong> 남음
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center lg:items-end gap-8 shrink-0 w-full lg:w-auto">
            <div className="flex flex-col items-center lg:items-end gap-3 w-full">
              <span className="font-mono text-[11px] font-bold tracking-mono text-neutral-400 uppercase">
                TOTAL LIVE BROADCAST HOURS
              </span>
              <StatCounter value={streamer.totalLiveHours} size="lg" stopPropagation />
            </div>
            {streamer.followerCount !== undefined && (
              <div className="flex flex-col items-center lg:items-end gap-3 w-full">
                <span className="font-mono text-[11px] font-bold tracking-mono text-neutral-400 uppercase">
                  TOTAL FOLLOWERS
                </span>
                <StatCounter value={streamer.followerCount} size="lg" stopPropagation />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Compile a comprehensive list of milestone achievements using exact recorded database dates or linear estimates
  const getStreamerMilestones = (streamer: Streamer) => {
    const milestoneCount = Math.floor(streamer.totalLiveHours / 1000);
    const list = [];
    const debutRef = getDebutReferenceDate(streamer.channelId, streamer.firstLiveDate) ?? undefined;

    const pushEstimatedHoursMilestone = (milestoneVal: number) => {
      try {
        if (!debutRef) throw new Error("no debut reference");
        const startDate = parseSafeDate(debutRef);
        const endDate = parseSafeDate(streamer.lastUpdated || new Date().toISOString());
        const totalHours = streamer.totalLiveHours;
        if (totalHours > 0) {
          const timeSpan = endDate.getTime() - startDate.getTime();
          const msPerHour = timeSpan / totalHours;
          const estimatedMs = startDate.getTime() + milestoneVal * msPerHour;
          list.push({
            milestone: milestoneVal,
            date: new Date(estimatedMs).toISOString(),
            isEstimated: true,
          });
        }
      } catch (err) {
        console.warn("Milestone estimation failed:", err);
      }
    };

    for (let m = 1; m <= milestoneCount; m++) {
      const milestoneVal = m * 1000;

      const archivedDate = getArchivedHoursMilestoneDate(
        streamer.channelId,
        milestoneVal,
        streamer.totalLiveHours,
        debutRef
      );
      if (archivedDate) {
        list.push({
          milestone: milestoneVal,
          date: archivedDate,
          isEstimated: false,
        });
        continue;
      }

      // Find exact match in database milestone list if exists
      const exactRecord = milestones.find(
        (rec) => rec.channelId === streamer.channelId && rec.milestone === milestoneVal
      );

      if (exactRecord) {
        list.push({
          milestone: milestoneVal,
          date: exactRecord.date,
          isEstimated: false,
        });
      } else {
        pushEstimatedHoursMilestone(milestoneVal);
      }
    }

    return list;
  };

  // Generate monotonically increasing curve data starting from (firstLiveDate, 0)
  const getFullHistoryData = (streamer: Streamer, streamerMilestones: { milestone: number; date: string }[]) => {
    const points: { date: Date; hours: number; label: string; isMilestone: boolean }[] = [];
    const debutRef = getDebutReferenceDate(streamer.channelId, streamer.firstLiveDate);
    const manualHoursHistory = sanitizeHoursHistoryForChart(
      getManualCumulativeHoursHistory(streamer.channelId, streamer.totalLiveHours),
      debutRef,
      streamer.totalLiveHours
    );
    const hasManualHoursHistory = manualHoursHistory.length > 0;
    const kvHourRows = (streamer.history || []).filter((row) => Number.isFinite(row.hours));
    const useKvHourHistory = kvHourRows.length >= 2;

    if (!useKvHourHistory && !hasManualHoursHistory && debutRef) {
      points.push({
        date: parseSafeDate(debutRef),
        hours: 0,
        label: "방송 시작일",
        isMilestone: false,
      });
    }

    if (!useKvHourHistory && !hasManualHoursHistory) {
      streamerMilestones.forEach((m) => {
        points.push({
          date: parseSafeDate(m.date),
          hours: m.milestone,
          label: `${m.milestone.toLocaleString()}시간 돌파`,
          isMilestone: true,
        });
      });
    }

    if (useKvHourHistory) {
      kvHourRows.forEach((row) => {
        points.push({
          date: parseHistoryDate(row.date),
          hours: row.hours,
          label: `${Math.round(row.hours).toLocaleString()}시간`,
          isMilestone: false,
        });
      });
    } else if (hasManualHoursHistory) {
      manualHoursHistory.forEach((point) => {
        points.push({
          date: parseHistoryDate(point.date),
          hours: point.hours,
          label: point.hours === 0 ? "방송 시작일" : `${Math.round(point.hours).toLocaleString()}시간`,
          isMilestone: false,
        });
      });
    } else if (streamer.history && streamer.history.length > 0) {
      streamer.history.forEach((h) => {
        points.push({
          date: parseHistoryDate(h.date),
          hours: h.hours,
          label: `${h.hours.toLocaleString()}시간`,
          isMilestone: false,
        });
      });
    }

    points.sort((a, b) => a.date.getTime() - b.date.getTime() || a.hours - b.hours);

    const uniquePoints: typeof points = [];
    let lastHours = -1;
    points.forEach((p) => {
      const existingIdx = uniquePoints.findIndex(
        (up) => up.date.getTime() === p.date.getTime() && up.hours === p.hours
      );
      if (existingIdx !== -1) {
        if (p.isMilestone) {
          uniquePoints[existingIdx] = p;
        }
        return;
      }

      if (p.hours >= lastHours || p.isMilestone) {
        uniquePoints.push(p);
        lastHours = Math.max(lastHours, p.hours);
      }
    });

    return uniquePoints;
  };

  // Compile a comprehensive list of follower milestone achievements (every 10,000 followers)
  const getStreamerFollowerMilestones = (streamer: Streamer) => {
    const followerCount = streamer.followerCount || 0;
    let milestoneCount = Math.floor(followerCount / 10000);
    const latestSnapshotDate = [
      streamer.lastUpdated,
      ...(streamer.history || []).map((record) => record.date),
    ]
      .map((date) => parseHistoryDate(date).getTime())
      .filter((time) => Number.isFinite(time))
      .sort((a, b) => b - a)[0];
    const latestSnapshotDay = latestSnapshotDate ? formatDateShort(new Date(latestSnapshotDate)) : "";
    const exactRecords = milestones
      .filter(
        (rec) =>
          rec.channelId === streamer.channelId &&
          rec.type === "followers" &&
          rec.milestone > 0
      )
      .filter(
        (rec) =>
          !(
            formatDateShort(rec.date) === latestSnapshotDay &&
            rec.milestone < followerCount
          )
      )
      .map((rec) => ({
        milestone: rec.milestone,
        date: rec.date,
      }));
    const maxObservedFollowers = Math.max(
      followerCount,
      ...(streamer.history || []).map((record) => record.followers || 0),
      ...exactRecords.map((record) => record.milestone)
    );
    milestoneCount = Math.max(milestoneCount, Math.floor(maxObservedFollowers / 10000));

    const manualFollowerHistory = sanitizeFollowerHistoryForChart(
      getManualFollowerHistory(streamer.channelId),
      getDebutReferenceDate(streamer.channelId, streamer.firstLiveDate)
    );
    const firstFollowerAnchor = manualFollowerHistory.find((point) => point.followers > 0);
    const anchors = [
      ...(firstFollowerAnchor
        ? [{ milestone: firstFollowerAnchor.followers, date: firstFollowerAnchor.date }]
        : []),
      ...exactRecords,
      {
        milestone: followerCount,
        date: streamer.lastUpdated || new Date().toISOString(),
      },
    ]
      .filter((point) => Number.isFinite(point.milestone))
      .sort((a, b) => a.milestone - b.milestone);

    const list: { milestone: number; date: string; isEstimated: boolean }[] = [];

    for (let m = 1; m <= milestoneCount; m++) {
      const milestoneVal = m * 10000;

      // Find exact match in database milestone list if exists
      const exactRecord = exactRecords.find((rec) => rec.milestone === milestoneVal);

      const archivedDate = getArchivedFollowerMilestoneDate(streamer.channelId, milestoneVal);
      if (archivedDate) {
        list.push({
          milestone: milestoneVal,
          date: archivedDate,
          isEstimated: false,
        });
        continue;
      }

      if (exactRecord) {
        list.push({
          milestone: milestoneVal,
          date: exactRecord.date,
          isEstimated: false,
        });
        continue;
      }

      // Estimate missing milestones between adjacent known anchors, not across the full lifetime.
      const lowerAnchor = [...anchors].reverse().find((point) => point.milestone < milestoneVal);
      const upperAnchor = anchors.find((point) => point.milestone > milestoneVal);

      if (!lowerAnchor || !upperAnchor || upperAnchor.milestone <= lowerAnchor.milestone) {
        continue;
      }

      try {
        const lowerTime = parseSafeDate(lowerAnchor.date).getTime();
        const upperTime = parseSafeDate(upperAnchor.date).getTime();
        const ratio = (milestoneVal - lowerAnchor.milestone) / (upperAnchor.milestone - lowerAnchor.milestone);
        const estimatedMs = lowerTime + (upperTime - lowerTime) * ratio;
        list.push({
          milestone: milestoneVal,
          date: new Date(estimatedMs).toISOString(),
          isEstimated: !hasArchivedFollowerHistory(streamer.channelId),
        });
      } catch (err) {
        console.warn("Follower milestone estimation failed:", err);
      }
    }

    return list;
  };

  // Follower growth curve — never force 0 at debut (pre-debut followers are valid).
  const getFullFollowerHistoryData = (streamer: Streamer, followerMilestones: { milestone: number; date: string }[]) => {
    const points: { date: Date; followers: number; label: string; isMilestone: boolean }[] = [];
    const currentFollowers = streamer.followerCount || 0;
    const debutRef = getDebutReferenceDate(streamer.channelId, streamer.firstLiveDate);
    const manualFollowerHistory = sanitizeFollowerHistoryForChart(
      getManualFollowerHistory(streamer.channelId),
      debutRef
    );

    followerMilestones.forEach((m) => {
      points.push({
        date: parseSafeDate(m.date),
        followers: m.milestone,
        label: `${formatFollowers(m.milestone)} 돌파`,
        isMilestone: true,
      });
    });

    const historyRows =
      streamer.history?.filter((row) => row.followers !== undefined && row.followers > 0) ?? [];

    if (historyRows.length > 0) {
      historyRows.forEach((h) => {
        points.push({
          date: parseHistoryDate(h.date),
          followers: h.followers!,
          label: `${formatFollowers(h.followers)}`,
          isMilestone: false,
        });
      });
    } else if (manualFollowerHistory.length > 0) {
      manualFollowerHistory.forEach((point) => {
        points.push({
          date: parseHistoryDate(point.date),
          followers: point.followers,
          label: `${formatFollowers(point.followers)}`,
          isMilestone: false,
        });
      });
    }

    if (points.length < 2 && currentFollowers > 0) {
      const snapshotDate = parseHistoryDate(streamer.lastUpdated || new Date().toISOString());
      const hasSnapshot = points.some((p) => p.date.getTime() === snapshotDate.getTime());

      if (!hasSnapshot) {
        points.push({
          date: snapshotDate,
          followers: currentFollowers,
          label: `${formatFollowers(currentFollowers)}`,
          isMilestone: false,
        });
      }
    }

    if (points.length === 1) {
      const onlyPoint = points[0];
      const previousDate = new Date(onlyPoint.date.getTime() - 24 * 60 * 60 * 1000);
      points.unshift({
        date: previousDate,
        followers: onlyPoint.followers,
        label: `${formatFollowers(onlyPoint.followers)} (기준값)`,
        isMilestone: false,
      });
    }

    points.sort((a, b) => a.date.getTime() - b.date.getTime() || a.followers - b.followers);

    const uniquePoints: typeof points = [];
    points.forEach((p) => {
      const existingIdx = uniquePoints.findIndex(
        (up) => up.date.getTime() === p.date.getTime() && up.followers === p.followers
      );
      if (existingIdx !== -1) {
        if (p.isMilestone) {
          uniquePoints[existingIdx] = p;
        }
        return;
      }

      uniquePoints.push(p);
    });

    let followerPeak = 0;
    return uniquePoints.map((point) => {
      followerPeak = Math.max(followerPeak, point.followers);
      return { ...point, followers: followerPeak };
    });
  };

  // Helper date utilities
  const formatDateKorean = (dateStr: string) => {
    if (!dateStr) return "기록 없음";

    try {
      const d = parseSafeDate(dateStr);
      return `${d.getFullYear()}년 ${String(d.getMonth() + 1).padStart(2, "0")}월 ${String(d.getDate()).padStart(2, "0")}일`;
    } catch {
      return dateStr;
    }
  };

  // Helper to format followers in Korean standard units of 10,000 (만)
  const formatFollowers = (count?: number) => {
    if (count === undefined || count === null) return "0명";
    if (count >= 10000) {
      const value = count / 10000;
      const formatted = value % 1 === 0 ? value.toFixed(0) : value.toFixed(1);
      return `${formatted}만명`;
    }
    return `${count.toLocaleString()}명`;
  };

  const toggleCardSort = (field: Exclude<CardSortField, null>) => {
    if (cardSortField === field) {
      setCardSortDir((prev) => (prev === "desc" ? "asc" : "desc"));
    } else {
      setCardSortField(field);
      setCardSortDir("desc");
    }
  };

  const groupCounts = useMemo(() => {
    const counts: Partial<Record<GroupTag, number>> = {};
    streamers.forEach((streamer) => {
      const tag = streamer.groupTag || getGroupTag(streamer.channelId);
      if (tag) counts[tag] = (counts[tag] ?? 0) + 1;
    });
    return counts;
  }, [streamers]);

  const isAllGroupsSelected = selectedGroupFilters.size === 0;

  const toggleGroupFilter = (tag: GroupTag) => {
    setSelectedGroupFilters((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  };

  const clearGroupFilters = () => setSelectedGroupFilters(new Set());

  const filteredStreamers = useMemo(() => {
    if (selectedGroupFilters.size === 0) return streamers;
    return streamers.filter((s) => {
      const tag = s.groupTag || getGroupTag(s.channelId);
      return tag && selectedGroupFilters.has(tag);
    });
  }, [streamers, selectedGroupFilters]);

  const filteredChannelIds = useMemo(
    () => new Set(filteredStreamers.map((streamer) => streamer.channelId)),
    [filteredStreamers]
  );

  const groupFilterBar = (
    <div className="flex flex-wrap items-center gap-2 mb-6">
      <span className="font-mono text-[11px] font-bold tracking-mono text-neutral-500 uppercase mr-1 shrink-0">
        소속
      </span>
      <span className="font-sans text-[11px] text-neutral-400 mr-1 shrink-0">복수 선택</span>
      <button
        type="button"
        onClick={clearGroupFilters}
        className={`inline-flex items-center h-9 px-3.5 rounded-full border text-[13px] font-bold transition-colors ${
          isAllGroupsSelected
            ? "bg-black text-white border-black"
            : "bg-white/70 text-neutral-700 border-white/80 hover:bg-white/90 glass-card-surface"
        }`}
      >
        전체
        <span className="ml-1.5 text-[11px] opacity-70">{streamers.length}</span>
      </button>
      {GROUP_FILTER_ORDER.filter((tag) => (groupCounts[tag] ?? 0) > 0).map((tag) => (
        <button
          key={tag}
          type="button"
          onClick={() => toggleGroupFilter(tag)}
          className={`inline-flex items-center h-9 px-3.5 rounded-full border text-[13px] font-bold transition-colors ${
            selectedGroupFilters.has(tag)
              ? "bg-black text-white border-black"
              : `bg-white/70 hover:bg-white/90 glass-card-surface ${GROUP_TAG_STYLES[tag]}`
          }`}
        >
          {tag}
          <span className="ml-1.5 text-[11px] opacity-70">{groupCounts[tag]}</span>
        </button>
      ))}
      {!isAllGroupsSelected && (
        <span className="font-sans text-[12px] text-neutral-500 ml-1">
          {filteredStreamers.length}명 표시
        </span>
      )}
    </div>
  );

  const getDebutSortTime = (streamer: Streamer): number | null => {
    const debut = getDebutReferenceDate(streamer.channelId, streamer.firstLiveDate);
    if (!debut) return null;
    return parseSafeDate(debut).getTime();
  };

  const sortedStreamers = useMemo(() => {
    let list = filteredStreamers;

    if (!cardSortField) return list;

    list = [...list];
    list.sort((a, b) => {
      if (cardSortField === "debut") {
        const left = getDebutSortTime(a);
        const right = getDebutSortTime(b);
        if (left === null && right === null) return 0;
        if (left === null) return 1;
        if (right === null) return -1;
        return cardSortDir === "desc" ? right - left : left - right;
      }

      const left = cardSortField === "hours" ? a.totalLiveHours : a.followerCount ?? 0;
      const right = cardSortField === "hours" ? b.totalLiveHours : b.followerCount ?? 0;
      return cardSortDir === "desc" ? right - left : left - right;
    });
    return list;
  }, [filteredStreamers, cardSortField, cardSortDir]);

  const formatDateShort = (dateStr: string | Date) => {
    try {
      const d = parseSafeDate(dateStr);
      return `${String(d.getFullYear()).slice(2)}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    } catch {
      return "";
    }
  };

  const buildChartTimeTicks = (minTimestamp: number, maxTimestamp: number, count = 6) => {
    if (!Number.isFinite(minTimestamp) || !Number.isFinite(maxTimestamp)) return [];
    if (minTimestamp >= maxTimestamp) return [minTimestamp];
    return Array.from({ length: count }, (_, index) =>
      Math.round(minTimestamp + ((maxTimestamp - minTimestamp) * index) / (count - 1))
    );
  };

  const createDailyInterpolatedData = (
    sourceData: NumericLinePoint[],
    valueKey: "hours" | "followers",
    formatEstimatedLabel: (value: number) => string
  ) => {
    const sorted = [...sourceData].sort((a, b) => a.timestamp - b.timestamp);
    const result: NumericLinePoint[] = [];
    const DAY_MS = 24 * 60 * 60 * 1000;

    sorted.forEach((point, index) => {
      result.push(point);

      const next = sorted[index + 1];
      if (!next) return;

      const startValue = Number(point[valueKey]);
      const endValue = Number(next[valueKey]);
      const duration = next.timestamp - point.timestamp;
      if (!Number.isFinite(startValue) || !Number.isFinite(endValue) || duration <= DAY_MS) {
        return;
      }

      const sample = new Date(point.timestamp);
      sample.setHours(12, 0, 0, 0);
      let sampleTimestamp = sample.getTime();
      if (sampleTimestamp <= point.timestamp) {
        sampleTimestamp += DAY_MS;
      }

      while (sampleTimestamp < next.timestamp) {
        const ratio = (sampleTimestamp - point.timestamp) / duration;
        const value = Math.round(startValue + (endValue - startValue) * ratio);
        result.push({
          timestamp: sampleTimestamp,
          date: formatDateShort(new Date(sampleTimestamp)),
          fullDate: formatDateFull(new Date(sampleTimestamp)),
          [valueKey]: value,
          label: formatEstimatedLabel(value),
          isMilestone: false,
          isInterpolated: true,
        });
        sampleTimestamp += DAY_MS;
      }
    });

    return result.sort((a, b) => a.timestamp - b.timestamp);
  };

  const getDaysDiff = (date1Str: string, date2Str: string) => {
    try {
      const d1 = parseSafeDate(date1Str).getTime();
      const d2 = parseSafeDate(date2Str).getTime();
      return Math.round(Math.abs(d2 - d1) / (1000 * 60 * 60 * 24));
    } catch {
      return 0;
    }
  };

  // Render Full detailed SVG graph inside analytical detail view
  const renderFullHistoryChart = (streamer: Streamer) => {
    const streamerMilestones = getStreamerMilestones(streamer);
    const chartPoints = getFullHistoryData(streamer, []);

    if (chartPoints.length < 2) return null;

    const chartColorSet = {
      rawHex: getStreamerAccentHex(streamer, extractedPalettes),
    };
    const dataPeakHours = Math.max(...chartPoints.map((point) => point.hours));
    const { max: chartMaxHours, ticks: hourTicks } = getHoursChartScale(
      streamer.totalLiveHours,
      dataPeakHours
    );
    const usesArchivedHours = hasArchivedHoursHistory(streamer.channelId);
    const baseChartData = chartPoints.map((p) => ({
      timestamp: p.date.getTime(),
      date: formatDateShort(p.date),
      fullDate: formatDateFull(p.date),
      hours: p.hours,
      label: p.label,
      isMilestone: p.isMilestone,
    }));
    const chartData = createDailyInterpolatedData(
      baseChartData,
      "hours",
      (value) =>
        usesArchivedHours
          ? `${value.toLocaleString()}시간`
          : `${value.toLocaleString()}시간 (추정)`
    );
    const hourChartTimeTicks = buildChartTimeTicks(
      chartData[0]?.timestamp ?? 0,
      chartData[chartData.length - 1]?.timestamp ?? 0
    );
    const hourMarkerData = streamerMilestones
      .map((m) => {
        const fallbackTimestamp = parseSafeDate(m.date).getTime();
        const projectedTimestamp = projectMilestoneTimestamp(chartData, "hours", m.milestone);
        const timestamp = projectedTimestamp ?? fallbackTimestamp;
        return {
          timestamp,
          milestone: m.milestone,
          date: formatDateShort(new Date(timestamp)),
          fullDate: formatDateFull(new Date(timestamp)),
          label: `${m.milestone.toLocaleString()}시간 돌파${m.isEstimated ? " (추정)" : ""}`,
        };
      })
      .filter((point) => Number.isFinite(point.timestamp));

    return (
      <div className="w-full h-[360px] bg-neutral-50 p-4 rounded-[24px] border border-hairline-soft">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 28, right: 30, left: 14, bottom: 28 }}>
            <CartesianGrid
              stroke={chartColorSet.rawHex}
              strokeOpacity={0.18}
              strokeDasharray="4 4"
              vertical={false}
            />
            <XAxis
              dataKey="timestamp"
              type="number"
              scale="time"
              domain={["dataMin", "dataMax"]}
              ticks={hourChartTimeTicks}
              tickFormatter={(value) => formatDateShort(new Date(Number(value)))}
              tick={{ fontSize: 11, fontFamily: "monospace", fontWeight: 700, fill: "#737373" }}
              tickMargin={12}
            />
            <YAxis
              width={58}
              domain={[0, chartMaxHours]}
              ticks={hourTicks}
              tickFormatter={(value) => `${Number(value).toLocaleString()}H`}
              tick={{ fontSize: 11, fontFamily: "monospace", fontWeight: 700, fill: "#a3a3a3" }}
            />
            <Tooltip
              cursor={{ stroke: "#000000", strokeOpacity: 0.28, strokeDasharray: "3 3" }}
              content={({ active, payload }) => {
                if (chartMarkerTooltip) return null;
                if (!active || !payload?.length) return null;
                const data = payload[0].payload;
                return (
                  <div className="rounded-[10px] border border-black bg-white px-4 py-3 text-left">
                    <div className="font-mono text-[11px] font-bold text-neutral-400">{data.fullDate}</div>
                    <div className="mt-1 font-mono text-[14px] font-extrabold text-black">{data.label}</div>
                    {data.isMilestone && (
                      <div className="mt-1 font-sans text-[10px] font-extrabold" style={{ color: chartColorSet.rawHex }}>
                        MILESTONE
                      </div>
                    )}
                  </div>
                );
              }}
            />
            <Line
              type="monotone"
              dataKey="hours"
              stroke={chartColorSet.rawHex}
              strokeWidth={4}
              dot={false}
              activeDot={{ r: 6, stroke: chartColorSet.rawHex, strokeWidth: 3, fill: "#ffffff" }}
              isAnimationActive={false}
            />
            {hourMarkerData.map((p) => (
              <ReferenceDot
                key={`hours-marker-${p.milestone}-${p.timestamp}`}
                x={p.timestamp}
                y={p.milestone}
                ifOverflow="visible"
                r={5}
                fill="#ffffff"
                stroke={chartColorSet.rawHex}
                strokeWidth={3}
                onMouseEnter={(_, event) => {
                  setChartMarkerTooltip({
                    x: event.clientX,
                    y: event.clientY,
                    label: p.label,
                    fullDate: p.fullDate,
                    color: chartColorSet.rawHex,
                  });
                }}
                onMouseMove={(_, event) => {
                  setChartMarkerTooltip({
                    x: event.clientX,
                    y: event.clientY,
                    label: p.label,
                    fullDate: p.fullDate,
                    color: chartColorSet.rawHex,
                  });
                }}
                onMouseLeave={() => setChartMarkerTooltip(null)}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    );

    const width = 800;
    const height = 360;
    const paddingLeft = 70;
    const paddingRight = 40;
    const paddingTop = 40;
    const paddingBottom = 60;

    const colorSet = COLOR_MAP[streamer.color] || COLOR_MAP.lime;

    const minTime = chartPoints[0].date.getTime();
    const maxTime = chartPoints[chartPoints.length - 1].date.getTime();
    const timeRange = maxTime - minTime || 1;

    const maxHours = Math.ceil((streamer.totalLiveHours + 1) / 1000) * 1000;

    const points = chartPoints.map((p) => {
      const x = paddingLeft + ((p.date.getTime() - minTime) / timeRange) * (width - paddingLeft - paddingRight);
      const y = height - paddingBottom - (p.hours / maxHours) * (height - paddingTop - paddingBottom);
      return { x, y, raw: p };
    });

    const pathData = `M ${points.map((p) => `${p.x} ${p.y}`).join(" L ")}`;

    const horizontalGridLines = [];
    for (let hVal = 1000; hVal <= maxHours; hVal += 1000) {
      const yLine = height - paddingBottom - (hVal / maxHours) * (height - paddingTop - paddingBottom);
      horizontalGridLines.push({ value: hVal, y: yLine });
    }

    return (
      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full min-w-[640px] h-auto overflow-visible select-none bg-neutral-50 p-4 rounded-[24px] border border-hairline-soft cursor-crosshair"
          onMouseMove={(e) => handleMouseMove(e, points, "hours")}
          onMouseLeave={() => setHoveredHoursPoint(null)}
        >
          <defs>
            <linearGradient id={`grad-${streamer.channelId}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colorSet.rawHex} stopOpacity="0.25" />
              <stop offset="100%" stopColor={colorSet.rawHex} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {horizontalGridLines.map((line, idx) => (
            <g key={idx}>
              <line
                x1={paddingLeft}
                y1={line.y}
                x2={width - paddingRight}
                y2={line.y}
                stroke={colorSet.rawHex}
                strokeWidth="1.5"
                strokeDasharray="4,4"
                strokeOpacity="0.2"
              />
              <text
                x={paddingLeft - 10}
                y={line.y + 3}
                textAnchor="end"
                className="font-mono text-[11px] font-bold fill-neutral-400"
              >
                {line.value.toLocaleString()}H
              </text>
            </g>
          ))}

          <line
            x1={paddingLeft}
            y1={height - paddingBottom}
            x2={width - paddingRight}
            y2={height - paddingBottom}
            stroke="#000000"
            strokeWidth="1.5"
            strokeOpacity="0.1"
          />

          <path
            d={`${pathData} L ${points[points.length - 1].x} ${height - paddingBottom} L ${points[0].x} ${height - paddingBottom} Z`}
            fill={`url(#grad-${streamer.channelId})`}
          />

          <path
            d={pathData}
            fill="none"
            stroke={colorSet.rawHex}
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {points.map((p, idx) => {
            if (!p.raw.isMilestone) return null;
            return (
              <g key={idx} className="group">
                {/* Vertical projection line to X-axis */}
                <line
                  x1={p.x}
                  y1={p.y + 6}
                  x2={p.x}
                  y2={height - paddingBottom}
                  stroke={colorSet.rawHex}
                  strokeWidth="1.2"
                  strokeDasharray="3,3"
                  strokeOpacity="0.5"
                />
                {/* Small tick mark on X-axis */}
                <circle
                  cx={p.x}
                  cy={height - paddingBottom}
                  r="3"
                  fill={colorSet.rawHex}
                />
                {/* Date text on X-axis */}
                <text
                  x={p.x}
                  y={height - paddingBottom + 18}
                  textAnchor="middle"
                  className="font-mono text-[10px] font-bold fill-neutral-600"
                >
                  {formatDateShort(p.raw.date)}
                </text>
                {/* Milestone value text on X-axis */}
                <text
                  x={p.x}
                  y={height - paddingBottom + 32}
                  textAnchor="middle"
                  className="font-sans text-[10px] font-extrabold"
                  style={{ fill: colorSet.rawHex }}
                >
                  {p.raw.hours ? `${(p.raw.hours / 1000).toFixed(0)}K` : ""}
                </text>

                <circle
                  cx={p.x}
                  cy={p.y}
                  r="8"
                  fill={colorSet.rawHex}
                  fillOpacity="0.2"
                />
                <circle
                  cx={p.x}
                  cy={p.y}
                  r="4.5"
                  fill="#ffffff"
                  stroke={colorSet.rawHex}
                  strokeWidth="3"
                  className="cursor-pointer"
                />
                <text
                  x={p.x}
                  y={p.y - 14}
                  textAnchor="middle"
                  className="font-mono text-[12px] font-bold fill-black"
                >
                  {(p.raw.hours / 1000)}K
                </text>
                <title>{`${p.raw.label}\n달성일자: ${formatDateShort(p.raw.date)}`}</title>
              </g>
            );
          })}

          {points.length > 0 && (
            <g>
              <circle
                cx={points[points.length - 1].x}
                cy={points[points.length - 1].y}
                r="6"
                fill={colorSet.rawHex}
              />
            </g>
          )}

          {/* Interactive Hover Guides & Tooltip */}
          {hoveredHoursPoint && (
            <g>
              {/* Vertical line */}
              <line
                x1={hoveredHoursPoint.x}
                y1={paddingTop}
                x2={hoveredHoursPoint.x}
                y2={height - paddingBottom}
                stroke="#000000"
                strokeWidth="1.5"
                strokeDasharray="3,3"
                opacity="0.3"
                className="pointer-events-none"
              />
              {/* Pulsing Outer circle */}
              <circle
                cx={hoveredHoursPoint.x}
                cy={hoveredHoursPoint.y}
                r="8"
                fill={colorSet.rawHex}
                opacity="0.4"
                className="pointer-events-none"
              />
              {/* Inner intersection circle */}
              <circle
                cx={hoveredHoursPoint.x}
                cy={hoveredHoursPoint.y}
                r="4"
                fill="#ffffff"
                stroke={colorSet.rawHex}
                strokeWidth="2"
                className="pointer-events-none"
              />

              {/* Render the beautiful custom tooltip box inside SVG */}
              {(() => {
                const tooltipX = hoveredHoursPoint.x + 15 > width - 180 ? hoveredHoursPoint.x - 170 : hoveredHoursPoint.x + 15;
                const tooltipY = Math.max(paddingTop, Math.min(hoveredHoursPoint.y - 45, height - paddingBottom - 75));
                return (
                  <g transform={`translate(${tooltipX}, ${tooltipY})`} className="pointer-events-none transition-all duration-100 ease-out">
                    <rect
                      width="155"
                      height="60"
                      rx="6"
                      fill="#ffffff"
                      stroke={hoveredHoursPoint.raw.isMilestone ? colorSet.rawHex : "#000000"}
                      strokeWidth={hoveredHoursPoint.raw.isMilestone ? "2.5" : "1.5"}
                      className="filter drop-shadow-sm"
                    />
                    <text
                      x="12"
                      y="20"
                      className="font-mono text-[10px] font-bold fill-neutral-400"
                    >
                      {formatDateFull(hoveredHoursPoint.raw.date)}
                    </text>
                    <text
                      x="12"
                      y="42"
                      className="font-mono text-[13px] font-extrabold fill-black"
                    >
                      {hoveredHoursPoint.raw.label}
                    </text>
                    {hoveredHoursPoint.raw.isMilestone && (
                      <text
                        x="143"
                        y="20"
                        textAnchor="end"
                        className="font-sans text-[9px] font-extrabold"
                        style={{ fill: colorSet.rawHex }}
                      >
                        ★ MILESTONE
                      </text>
                    )}
                  </g>
                );
              })()}
            </g>
          )}

        </svg>
      </div>
    );
  };

  const renderBroadcastActivityCharts = (streamer: Streamer) => {
    if (!hasBroadcastActivityData(streamer.channelId, streamer.history)) {
      return (
        <div className="w-full rounded-[24px] border border-dashed border-hairline bg-neutral-50 px-6 py-10 text-center text-[14px] font-medium text-neutral-500">
          방송 활동 기록이 충분히 쌓이면 최근 활동 막대 그래프가 표시됩니다.
        </div>
      );
    }

    const accentHex = getStreamerAccentHex(streamer, extractedPalettes);
    const endDay = resolveBroadcastActivityEndDay(
      streamer.channelId,
      streamer.history,
      streamer.lastUpdated
    );

    const rangeOptions: { range: BroadcastActivityRange; label: string; hint: string }[] = [
      { range: "7d", label: "7일", hint: "일별" },
      { range: "30d", label: "30일", hint: "일별" },
      { range: "90d", label: "90일", hint: "주별" },
    ];

    const activeOption = rangeOptions.find((option) => option.range === broadcastActivityRange) ?? rangeOptions[0];
    const { bars, periodTotal } = getBroadcastActivityBars(
      streamer.channelId,
      streamer.history,
      broadcastActivityRange,
      endDay
    );

    if (bars.length === 0) {
      return (
        <div className="w-full rounded-[24px] border border-dashed border-hairline bg-neutral-50 px-6 py-10 text-center text-[14px] font-medium text-neutral-500">
          선택한 기간에 표시할 방송 활동 기록이 없습니다.
        </div>
      );
    }

    const maxHours = Math.max(...bars.map((bar) => bar.hours), 1);
    const yMax = Math.max(Math.ceil(maxHours * 1.08), 8);

    return (
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="inline-flex flex-wrap items-center gap-2 p-1 rounded-full border border-hairline bg-neutral-50">
            {rangeOptions.map(({ range, label, hint }) => {
              const active = broadcastActivityRange === range;
              return (
                <button
                  key={range}
                  type="button"
                  onClick={() => setBroadcastActivityRange(range)}
                  className={`inline-flex items-center gap-1.5 h-9 px-4 rounded-full text-[13px] font-bold transition-colors ${
                    active
                      ? "bg-black text-white shadow-sm"
                      : "text-neutral-600 hover:bg-white hover:text-black"
                  }`}
                >
                  <span>{label}</span>
                  <span className={`text-[10px] font-mono ${active ? "text-white/70" : "text-neutral-400"}`}>
                    {hint}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="text-right">
            <div className="font-mono text-[10px] font-bold text-neutral-400 uppercase">기간 합계</div>
            <div className="font-mono text-[16px] font-extrabold text-black">
              {periodTotal.toLocaleString()}시간
            </div>
          </div>
        </div>

        <div className="rounded-[24px] border border-hairline-soft bg-neutral-50 p-4 min-h-[300px]">
          <div className="mb-3">
            <div className="font-mono text-[10px] font-bold tracking-mono text-neutral-400 uppercase">
              {activeOption.hint} · {activeOption.label}
            </div>
            <h4 className="font-sans text-[16px] font-bold text-black mt-0.5">
              {broadcastActivityRange === "90d" ? "주간 방송 시간" : "일별 방송 시간"}
            </h4>
          </div>

          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bars} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#e5e5e5" strokeDasharray="4 4" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fontFamily: "monospace", fontWeight: 700, fill: "#737373" }}
                  tickMargin={8}
                  interval={broadcastActivityRange === "30d" ? "preserveStartEnd" : 0}
                  minTickGap={broadcastActivityRange === "30d" ? 12 : 4}
                />
                <YAxis
                  domain={[0, yMax]}
                  tick={{ fontSize: 10, fontFamily: "monospace", fontWeight: 700, fill: "#737373" }}
                  tickFormatter={(value) => `${value}h`}
                  width={42}
                />
                <Tooltip
                  cursor={{ fill: "rgba(0,0,0,0.04)" }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const item = payload[0].payload as { label: string; hours: number; key?: string };
                    return (
                      <div className="rounded-[10px] border border-black bg-white px-3 py-2 text-left shadow-sm">
                        <div className="font-mono text-[11px] font-bold text-neutral-400">{item.label}</div>
                        <div className="mt-1 font-mono text-[14px] font-extrabold text-black">
                          {item.hours.toLocaleString()}시간
                        </div>
                      </div>
                    );
                  }}
                />
                <Bar
                  dataKey="hours"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={broadcastActivityRange === "30d" ? 22 : broadcastActivityRange === "90d" ? 48 : 40}
                >
                  {bars.map((bar) => (
                    <Cell
                      key={`${broadcastActivityRange}-${bar.key}`}
                      fill={bar.hours > 0 ? accentHex : "#d4d4d4"}
                      fillOpacity={bar.hours > 0 ? 0.92 : 0.35}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
  };

  const renderFullFollowerHistoryChart = (streamer: Streamer) => {
    const followerMilestones = getStreamerFollowerMilestones(streamer);
    const chartPoints = getFullFollowerHistoryData(streamer, []);

    if (chartPoints.length < 2) return null;

    const chartColorSet = {
      rawHex: getStreamerAccentHex(streamer, extractedPalettes),
    };
    const chartMaxFollowers = Math.ceil((streamer.followerCount || 10000) / 10000) * 10000;
    const followerTicks = Array.from({ length: Math.floor(chartMaxFollowers / 10000) + 1 }, (_, index) => index * 10000);
    const usesArchivedFollowers = hasArchivedFollowerHistory(streamer.channelId);
    const baseChartData = chartPoints.map((p) => ({
      timestamp: p.date.getTime(),
      date: formatDateShort(p.date),
      fullDate: formatDateFull(p.date),
      followers: p.followers,
      label: p.label,
      isMilestone: p.isMilestone,
    }));
    const chartData = createDailyInterpolatedData(
      baseChartData,
      "followers",
      (value) =>
        usesArchivedFollowers ? formatFollowers(value) : `${formatFollowers(value)} (추정)`
    );
    const followerChartTimeTicks = buildChartTimeTicks(
      chartData[0]?.timestamp ?? 0,
      chartData[chartData.length - 1]?.timestamp ?? 0
    );
    const followerMarkerData = followerMilestones
      .map((m) => {
        const fallbackTimestamp = parseSafeDate(m.date).getTime();
        const projectedTimestamp = projectMilestoneTimestamp(chartData, "followers", m.milestone);
        const timestamp = projectedTimestamp ?? fallbackTimestamp;
        return {
          timestamp,
          milestone: m.milestone,
          date: formatDateShort(new Date(timestamp)),
          fullDate: formatDateFull(new Date(timestamp)),
          label: `${formatFollowers(m.milestone)} 돌파${m.isEstimated ? " (추정)" : ""}`,
        };
      })
      .filter((point) => Number.isFinite(point.timestamp));

    return (
      <div className="w-full h-[360px] bg-neutral-50 p-4 rounded-[24px] border border-hairline-soft">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 28, right: 30, left: 14, bottom: 28 }}>
            <CartesianGrid
              stroke={chartColorSet.rawHex}
              strokeOpacity={0.18}
              strokeDasharray="4 4"
              vertical={false}
            />
            <XAxis
              dataKey="timestamp"
              type="number"
              scale="time"
              domain={["dataMin", "dataMax"]}
              ticks={followerChartTimeTicks}
              tickFormatter={(value) => formatDateShort(new Date(Number(value)))}
              tick={{ fontSize: 11, fontFamily: "monospace", fontWeight: 700, fill: "#737373" }}
              tickMargin={12}
            />
            <YAxis
              width={58}
              domain={[0, chartMaxFollowers]}
              ticks={followerTicks}
              tickFormatter={(value) => formatFollowers(Number(value))}
              tick={{ fontSize: 11, fontFamily: "monospace", fontWeight: 700, fill: "#a3a3a3" }}
            />
            <Tooltip
              cursor={{ stroke: "#000000", strokeOpacity: 0.28, strokeDasharray: "3 3" }}
              content={({ active, payload }) => {
                if (chartMarkerTooltip) return null;
                if (!active || !payload?.length) return null;
                const data = payload[0].payload;
                return (
                  <div className="rounded-[10px] border border-black bg-white px-4 py-3 text-left">
                    <div className="font-mono text-[11px] font-bold text-neutral-400">{data.fullDate}</div>
                    <div className="mt-1 font-mono text-[14px] font-extrabold text-black">{data.label}</div>
                    {data.isMilestone && (
                      <div className="mt-1 font-sans text-[10px] font-extrabold" style={{ color: chartColorSet.rawHex }}>
                        MILESTONE
                      </div>
                    )}
                  </div>
                );
              }}
            />
            <Line
              type="monotone"
              dataKey="followers"
              stroke={chartColorSet.rawHex}
              strokeWidth={4}
              dot={false}
              activeDot={{ r: 6, stroke: chartColorSet.rawHex, strokeWidth: 3, fill: "#ffffff" }}
              isAnimationActive={false}
            />
            {followerMarkerData.map((p) => (
              <ReferenceDot
                key={`followers-marker-${p.milestone}-${p.timestamp}`}
                x={p.timestamp}
                y={p.milestone}
                ifOverflow="visible"
                r={5}
                fill="#ffffff"
                stroke={chartColorSet.rawHex}
                strokeWidth={3}
                onMouseEnter={(_, event) => {
                  setChartMarkerTooltip({
                    x: event.clientX,
                    y: event.clientY,
                    label: p.label,
                    fullDate: p.fullDate,
                    color: chartColorSet.rawHex,
                  });
                }}
                onMouseMove={(_, event) => {
                  setChartMarkerTooltip({
                    x: event.clientX,
                    y: event.clientY,
                    label: p.label,
                    fullDate: p.fullDate,
                    color: chartColorSet.rawHex,
                  });
                }}
                onMouseLeave={() => setChartMarkerTooltip(null)}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    );

    const width = 800;
    const height = 360;
    const paddingLeft = 70;
    const paddingRight = 40;
    const paddingTop = 40;
    const paddingBottom = 60;

    const colorSet = COLOR_MAP[streamer.color] || COLOR_MAP.lime;

    const minTime = chartPoints[0].date.getTime();
    const maxTime = chartPoints[chartPoints.length - 1].date.getTime();
    const timeRange = maxTime - minTime || 1;

    // Follower milestones are every 10,000
    const maxFollowers = Math.ceil((streamer.followerCount || 10000) / 10000) * 10000;

    const points = chartPoints.map((p) => {
      const x = paddingLeft + ((p.date.getTime() - minTime) / timeRange) * (width - paddingLeft - paddingRight);
      const y = height - paddingBottom - (p.followers / maxFollowers) * (height - paddingTop - paddingBottom);
      return { x, y, raw: p };
    });

    const pathData = `M ${points.map((p) => `${p.x} ${p.y}`).join(" L ")}`;

    const horizontalGridLines = [];
    const step = maxFollowers > 100000 ? 30000 : maxFollowers > 50000 ? 20000 : 10000;
    for (let fVal = step; fVal <= maxFollowers; fVal += step) {
      const yLine = height - paddingBottom - (fVal / maxFollowers) * (height - paddingTop - paddingBottom);
      horizontalGridLines.push({ value: fVal, y: yLine });
    }

    return (
      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full min-w-[640px] h-auto overflow-visible select-none bg-neutral-50 p-4 rounded-[24px] border border-hairline-soft cursor-crosshair"
          onMouseMove={(e) => handleMouseMove(e, points, "followers")}
          onMouseLeave={() => setHoveredFollowersPoint(null)}
        >
          <defs>
            <linearGradient id={`grad-fol-${streamer.channelId}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colorSet.rawHex} stopOpacity="0.25" />
              <stop offset="100%" stopColor={colorSet.rawHex} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {horizontalGridLines.map((line, idx) => (
            <g key={idx}>
              <line
                x1={paddingLeft}
                y1={line.y}
                x2={width - paddingRight}
                y2={line.y}
                stroke={colorSet.rawHex}
                strokeWidth="1.5"
                strokeDasharray="4,4"
                strokeOpacity="0.2"
              />
              <text
                x={paddingLeft - 10}
                y={line.y + 3}
                textAnchor="end"
                className="font-mono text-[11px] font-bold fill-neutral-400"
              >
                {formatFollowers(line.value)}
              </text>
            </g>
          ))}

          <line
            x1={paddingLeft}
            y1={height - paddingBottom}
            x2={width - paddingRight}
            y2={height - paddingBottom}
            stroke="#000000"
            strokeWidth="1.5"
            strokeOpacity="0.1"
          />

          <path
            d={`${pathData} L ${points[points.length - 1].x} ${height - paddingBottom} L ${points[0].x} ${height - paddingBottom} Z`}
            fill={`url(#grad-fol-${streamer.channelId})`}
          />

          <path
            d={pathData}
            fill="none"
            stroke={colorSet.rawHex}
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {points.map((p, idx) => {
            if (!p.raw.isMilestone) return null;
            return (
              <g key={idx} className="group">
                {/* Vertical projection line to X-axis */}
                <line
                  x1={p.x}
                  y1={p.y + 6}
                  x2={p.x}
                  y2={height - paddingBottom}
                  stroke={colorSet.rawHex}
                  strokeWidth="1.2"
                  strokeDasharray="3,3"
                  strokeOpacity="0.5"
                />
                {/* Small tick mark on X-axis */}
                <circle
                  cx={p.x}
                  cy={height - paddingBottom}
                  r="3"
                  fill={colorSet.rawHex}
                />
                {/* Date text on X-axis */}
                <text
                  x={p.x}
                  y={height - paddingBottom + 18}
                  textAnchor="middle"
                  className="font-mono text-[10px] font-bold fill-neutral-600"
                >
                  {formatDateShort(p.raw.date)}
                </text>
                {/* Milestone value text on X-axis */}
                <text
                  x={p.x}
                  y={height - paddingBottom + 32}
                  textAnchor="middle"
                  className="font-sans text-[10px] font-extrabold"
                  style={{ fill: colorSet.rawHex }}
                >
                  {p.raw.followers ? `${p.raw.followers / 10000}만` : ""}
                </text>

                <circle
                  cx={p.x}
                  cy={p.y}
                  r="8"
                  fill={colorSet.rawHex}
                  fillOpacity="0.2"
                />
                <circle
                  cx={p.x}
                  cy={p.y}
                  r="4.5"
                  fill="#ffffff"
                  stroke={colorSet.rawHex}
                  strokeWidth="3"
                  className="cursor-pointer"
                />
                <text
                  x={p.x}
                  y={p.y - 14}
                  textAnchor="middle"
                  className="font-mono text-[12px] font-bold fill-black"
                >
                  {p.raw.followers ? `${p.raw.followers / 10000}만` : ""}
                </text>
                <title>{`${p.raw.label}\n달성일자: ${formatDateShort(p.raw.date)}`}</title>
              </g>
            );
          })}

          {points.length > 0 && (
            <g>
              <circle
                cx={points[points.length - 1].x}
                cy={points[points.length - 1].y}
                r="6"
                fill={colorSet.rawHex}
              />
            </g>
          )}

          {/* Interactive Hover Guides & Tooltip */}
          {hoveredFollowersPoint && (
            <g>
              {/* Vertical line */}
              <line
                x1={hoveredFollowersPoint.x}
                y1={paddingTop}
                x2={hoveredFollowersPoint.x}
                y2={height - paddingBottom}
                stroke="#000000"
                strokeWidth="1.5"
                strokeDasharray="3,3"
                opacity="0.3"
                className="pointer-events-none"
              />
              {/* Pulsing Outer circle */}
              <circle
                cx={hoveredFollowersPoint.x}
                cy={hoveredFollowersPoint.y}
                r="8"
                fill={colorSet.rawHex}
                opacity="0.4"
                className="pointer-events-none"
              />
              {/* Inner intersection circle */}
              <circle
                cx={hoveredFollowersPoint.x}
                cy={hoveredFollowersPoint.y}
                r="4"
                fill="#ffffff"
                stroke={colorSet.rawHex}
                strokeWidth="2"
                className="pointer-events-none"
              />

              {/* Render the beautiful custom tooltip box inside SVG */}
              {(() => {
                const tooltipX = hoveredFollowersPoint.x + 15 > width - 180 ? hoveredFollowersPoint.x - 170 : hoveredFollowersPoint.x + 15;
                const tooltipY = Math.max(paddingTop, Math.min(hoveredFollowersPoint.y - 45, height - paddingBottom - 75));
                return (
                  <g transform={`translate(${tooltipX}, ${tooltipY})`} className="pointer-events-none transition-all duration-100 ease-out">
                    <rect
                      width="155"
                      height="60"
                      rx="6"
                      fill="#ffffff"
                      stroke={hoveredFollowersPoint.raw.isMilestone ? colorSet.rawHex : "#000000"}
                      strokeWidth={hoveredFollowersPoint.raw.isMilestone ? "2.5" : "1.5"}
                      className="filter drop-shadow-sm"
                    />
                    <text
                      x="12"
                      y="20"
                      className="font-mono text-[10px] font-bold fill-neutral-400"
                    >
                      {formatDateFull(hoveredFollowersPoint.raw.date)}
                    </text>
                    <text
                      x="12"
                      y="42"
                      className="font-mono text-[13px] font-extrabold fill-black"
                    >
                      {hoveredFollowersPoint.raw.label}
                    </text>
                    {hoveredFollowersPoint.raw.isMilestone && (
                      <text
                        x="143"
                        y="20"
                        textAnchor="end"
                        className="font-sans text-[9px] font-extrabold"
                        style={{ fill: colorSet.rawHex }}
                      >
                        ★ MILESTONE
                      </text>
                    )}
                  </g>
                );
              })()}
            </g>
          )}

        </svg>
      </div>
    );
  };

  const selectedStreamer = streamers.find((s) => s.channelId === activeStreamerId);
  const topFollowerChasersByWeight = useMemo(
    () =>
      filteredStreamers
        .map((streamer) => ({
          streamer,
          stats: getFollowerMilestoneStats(streamer.followerCount || 0),
        }))
        .sort(
          (a, b) =>
            a.stats.weightedRemainingScore - b.stats.weightedRemainingScore ||
            a.stats.followersRemaining - b.stats.followersRemaining
        )
        .slice(0, 5),
    [filteredStreamers]
  );
  const topFollowerChasersByCount = useMemo(
    () =>
      filteredStreamers
        .map((streamer) => ({
          streamer,
          stats: getFollowerMilestoneStats(streamer.followerCount || 0),
        }))
        .sort((a, b) => a.stats.followersRemaining - b.stats.followersRemaining)
        .slice(0, 5),
    [filteredStreamers]
  );
  const topDebutAnniversaryChasers = useMemo(
    () =>
      filteredStreamers
        .map((streamer) => ({
          streamer,
          event: getNextCommemorativeEvent(
            getDebutReferenceDate(streamer.channelId, streamer.firstLiveDate),
            getStreamerBirthday(streamer.channelId)
          ),
        }))
        .filter(
          (entry): entry is typeof entry & { event: NonNullable<typeof entry.event> } => entry.event !== null
        )
        .sort((a, b) => a.event.daysUntil - b.event.daysUntil)
        .slice(0, 5),
    [filteredStreamers]
  );
  const topHoursChasers = useMemo(
    () =>
      filteredStreamers
        .map((streamer) => ({
          streamer,
          stats: getMilestoneStats(streamer.totalLiveHours),
        }))
        .sort((a, b) => a.stats.hoursRemaining - b.stats.hoursRemaining)
        .slice(0, 5),
    [filteredStreamers]
  );

  const renderChaserColumn = <T extends { streamer: Streamer }>(
    entries: T[],
    title: string,
    icon: ReactNode,
    getDetail: (entry: T) => ReactNode
  ) => {
    if (entries.length === 0) return null;

    return (
      <div className="flex h-full min-w-0 flex-col rounded-[20px] border border-hairline bg-white/80 backdrop-blur-sm overflow-hidden shadow-sm">
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-hairline bg-neutral-50/70 shrink-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-neutral-400 shrink-0">{icon}</span>
            <span className="font-mono text-[10px] font-bold tracking-mono text-neutral-500 uppercase truncate">
              {title}
            </span>
          </div>
          <span className="font-mono text-[10px] font-bold tracking-mono text-neutral-400 shrink-0 ml-2">TOP 5</span>
        </div>

        <div className="divide-y divide-hairline-soft flex-1">
          {entries.map((entry, index) => (
            <button
              key={entry.streamer.channelId}
              type="button"
              onClick={() => handleSelectStreamer(entry.streamer.channelId)}
              className={`group w-full flex h-[52px] min-h-[52px] items-center gap-2 px-3 text-left transition-colors ${
                index === 0
                  ? "bg-gradient-to-r from-amber-50 via-white to-white hover:from-amber-100/80 ring-1 ring-inset ring-amber-200/70 shadow-[inset_3px_0_0_0_rgba(0,0,0,0.85)]"
                  : "bg-white/40 hover:bg-neutral-50/90"
              }`}
            >
              <span
                className={`font-mono font-bold shrink-0 flex items-center justify-center ${
                  index === 0
                    ? "w-6 h-6 rounded-full bg-black text-white text-[9px]"
                    : "w-6 text-[10px] text-neutral-400"
                }`}
              >
                #{index + 1}
              </span>
              <div
                className={`relative aspect-square shrink-0 overflow-hidden rounded-full bg-neutral-100 ${
                  index === 0
                    ? "size-9 border-2 border-black/15 ring-2 ring-inset ring-amber-200/80"
                    : "size-8 border border-hairline"
                }`}
              >
                <StreamerChannelImage
                  src={entry.streamer.channelImageUrl}
                  alt={entry.streamer.channelName}
                  variant="avatar"
                />
              </div>
              <div className="min-w-0 flex-1 overflow-hidden">
                <div
                  className={`font-sans truncate leading-tight ${
                    index === 0 ? "text-[13px] font-extrabold text-black" : "text-[12px] font-bold text-neutral-800"
                  }`}
                >
                  {entry.streamer.channelName}
                </div>
                <div
                  className={`truncate whitespace-nowrap text-[10px] font-medium leading-tight mt-0.5 ${
                    index === 0 ? "text-neutral-700" : "text-neutral-500"
                  }`}
                >
                  {getDetail(entry)}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  };

  // If a streamer is selected, render their DEDICATED FULL-SCREEN PROFILE PAGE
  if (selectedStreamer) {
    const accentHex = getStreamerAccentHex(selectedStreamer, extractedPalettes);
    const streamerMilestones = getStreamerMilestones(selectedStreamer);

    return (
      <div className="max-w-[1040px] mx-auto px-6 py-4 animate-in fade-in slide-in-from-bottom-6 duration-300 relative">
        {chartMarkerTooltip && (
          <div
            className="fixed z-[9999] pointer-events-none rounded-[10px] border border-black bg-white px-4 py-3 text-left"
            style={{
              left: Math.min(chartMarkerTooltip.x + 14, (typeof window !== "undefined" ? window.innerWidth : 1280) - 180),
              top: Math.max(chartMarkerTooltip.y - 48, 12),
            }}
          >
            <div className="font-mono text-[11px] font-bold text-neutral-400">{chartMarkerTooltip.fullDate}</div>
            <div className="mt-1 font-mono text-[14px] font-extrabold text-black">{chartMarkerTooltip.label}</div>
            <div className="mt-1 font-sans text-[10px] font-extrabold" style={{ color: chartMarkerTooltip.color }}>
              MILESTONE
            </div>
          </div>
        )}

        {/* Floating Back Button (FAB) that tracks scrolling */}
        <div className="fixed bottom-8 right-8 z-50 animate-in fade-in zoom-in duration-300">
          <button
            onClick={() => {
              handleSelectStreamer(null);
            }}
            className="flex items-center gap-2 px-6 py-3.5 rounded-full bg-black text-white hover:bg-neutral-900 border border-neutral-800 text-[14px] font-bold shadow-2xl active:scale-95 transition-all hover:scale-105"
          >
            <ChevronLeft className="w-5 h-5" />
            <span>목록으로 돌아가기</span>
          </button>
        </div>

        {/* Sleek top navigation / Back button */}
        <div className="mb-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <button
            onClick={() => {
              handleSelectStreamer(null);
            }}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-white border border-hairline hover:bg-neutral-50 text-neutral-800 text-[14px] font-bold transition-all shadow-sm active:scale-95"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>전체 스트리머 목록으로 돌아가기</span>
          </button>

          <div className="flex flex-wrap items-center justify-end gap-2">
            {hasNamuwikiProfile(selectedStreamer.channelId) && (
              <a
                href={getNamuwikiUrl(selectedStreamer.channelId)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-green-50 text-green-900 border border-green-100 hover:bg-green-100 text-[14px] font-bold transition-colors"
              >
                <span>나무위키</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
            <a
              href={`https://chzzk.naver.com/${selectedStreamer.channelId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-100 hover:bg-emerald-100 text-[14px] font-bold transition-colors"
            >
              <span>치지직 채널 바로가기</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* 1. TOP SECTION: Streamer Header & stat counters */}
        <div className="mb-10">{renderStreamerProfileHeader(selectedStreamer)}</div>

        {/* 2. MIDDLE SECTION: Two Big Growth Curve Graphs */}
        <div className="space-y-10 mb-10">
          {/* Hour Growth Graph */}
          <div className="bg-white border border-hairline rounded-[32px] p-6 md:p-8 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-hairline-soft pb-4">
              <div>
                <span className="font-mono text-[11px] font-bold tracking-mono text-neutral-400 uppercase">
                  GROWTH LINE CHART (HOURS)
                </span>
                <h3 className="font-sans text-[22px] font-bold text-black tracking-tight mt-0.5">
                  누적 방송 시간 성장 그래프
                </h3>
              </div>
              <div className="flex items-center gap-4 text-[12px] font-medium text-neutral-500">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-1.5 rounded-full" style={{ backgroundColor: accentHex }} /> 성장 곡선
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-1.5 border-b border-dashed border-neutral-300" /> 1,000H 마일스톤
                </span>
              </div>
            </div>

            <div className="space-y-4">
              {renderFullHistoryChart(selectedStreamer)}
              <div className="bg-neutral-50 p-4 rounded-2xl border border-hairline-soft text-[13px] text-neutral-600 leading-relaxed text-center font-medium">
                ✨ 데뷔일로부터의 일대기를 담은 방송 누적 성장 곡선입니다. 원형 노드 점은 해당 스트리머가 매 1,000시간 마일스톤 고지를 넘어선 순간들을 가리킵니다.
              </div>
            </div>
          </div>

          {/* Recent broadcast activity bar charts */}
          <div className="bg-white border border-hairline rounded-[32px] p-6 md:p-8 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-hairline-soft pb-4">
              <div>
                <span className="font-mono text-[11px] font-bold tracking-mono text-neutral-400 uppercase">
                  BROADCAST ACTIVITY (BAR)
                </span>
                <h3 className="font-sans text-[22px] font-bold text-black tracking-tight mt-0.5">
                  최근 방송 활동 막대 그래프
                </h3>
              </div>
              <div className="text-[12px] font-medium text-neutral-500">
                치지직 API 스냅샷 · 보관 이력 기준
              </div>
            </div>

            {renderBroadcastActivityCharts(selectedStreamer)}

            <div className="bg-neutral-50 p-4 rounded-2xl border border-hairline-soft text-[13px] text-neutral-600 leading-relaxed text-center font-medium">
              ✨ 7일·30일은 일별, 90일은 주별 방송 시간입니다. 보관 이력의 주간 스냅샷을 기준으로 표시합니다.
            </div>
          </div>

          {/* Follower Growth Graph */}
          <div className="bg-white border border-hairline rounded-[32px] p-6 md:p-8 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-hairline-soft pb-4">
              <div>
                <span className="font-mono text-[11px] font-bold tracking-mono text-neutral-400 uppercase">
                  GROWTH LINE CHART (FOLLOWERS)
                </span>
                <h3 className="font-sans text-[22px] font-bold text-black tracking-tight mt-0.5">
                  누적 팔로워 수 성장 그래프
                </h3>
              </div>
              <div className="flex items-center gap-4 text-[12px] font-medium text-neutral-500">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-1.5 rounded-full" style={{ backgroundColor: accentHex }} /> 성장 곡선
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-1.5 border-b border-dashed border-neutral-300" /> 1만명 마일스톤
                </span>
              </div>
            </div>

            <div className="space-y-4">
              {renderFullFollowerHistoryChart(selectedStreamer)}
              <div className="bg-neutral-50 p-4 rounded-2xl border border-hairline-soft text-[13px] text-neutral-600 leading-relaxed text-center font-medium">
                ✨ 데뷔일로부터의 실시간 팔로워 성장 곡선입니다. 원형 노드 점은 해당 스트리머가 매 10,000명(1만명) 팔로워 마일스톤 고지를 넘어선 순간들을 가리킵니다.
              </div>
            </div>
          </div>
        </div>

        {/* 3. BOTTOM SECTION: Combined Milestone Achievements Table */}
        <div className="bg-white border border-hairline rounded-[32px] p-6 md:p-8">
          <div className="border-b border-hairline pb-4 mb-6">
            <span className="font-mono text-[11px] font-bold tracking-mono text-neutral-400 uppercase">
              MILESTONE ARCHIVES
            </span>
            <h3 className="font-sans text-[22px] font-bold text-black flex items-center gap-2 mt-0.5">
              <Trophy className="w-5 h-5 text-yellow-500" /> 누적 마일스톤 달성 일지
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-hairline-soft text-[12px] font-mono tracking-mono text-neutral-400 uppercase font-bold">
                  <th className="pb-3 pl-4">달성 고지</th>
                  <th className="pb-3">유형</th>
                  <th className="pb-3">달성 날짜</th>
                  <th className="pb-3">소요 기간</th>
                  <th className="pb-3 pr-4 text-right">상태</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline-soft font-sans text-[14px]">
                {(() => {
                  const hoursMilestonesMapped = streamerMilestones.map(m => ({ ...m, type: "hours" }));
                  const followerMilestonesMapped = getStreamerFollowerMilestones(selectedStreamer).map(m => ({ ...m, type: "followers" }));
                  const allStreamerMilestones = [...hoursMilestonesMapped, ...followerMilestonesMapped].sort(
                    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
                  );

                  if (allStreamerMilestones.length === 0) {
                    return (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-neutral-400 font-medium font-sans">
                          수집 전 달성된 과거 마일스톤 돌파 기록은 상세 일자 수집 목록에서 제외됩니다.
                        </td>
                      </tr>
                    );
                  }

                  return allStreamerMilestones.map((mRecord, idx) => {
                    const daysTaken = getDaysDiff(selectedStreamer.firstLiveDate, mRecord.date);

                    return (
                      <tr key={idx} className="hover:bg-neutral-50/50 transition-colors">
                        <td className="py-4 pl-4 font-bold text-black flex items-center gap-2 text-[15px]">
                          {mRecord.type === "hours" ? (
                            <>
                              <Trophy className="w-4 h-4 text-yellow-500" />
                              {mRecord.milestone.toLocaleString()}시간 돌파
                            </>
                          ) : (
                            <>
                              <Users className="w-4 h-4 text-[#a46cfc]" />
                              팔로워 {formatFollowers(mRecord.milestone)} 돌파
                            </>
                          )}
                        </td>
                        <td className="py-4 font-medium">
                          {mRecord.type === "hours" ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-100">
                              🕒 방송시간
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                              👥 팔로워
                            </span>
                          )}
                        </td>
                        <td className="py-4 text-neutral-800 font-medium" suppressHydrationWarning>
                          {mRecord.isEstimated ? (
                            <span className="text-neutral-600">
                              {formatDateKorean(mRecord.date)}{" "}
                              <span className="text-[11px] text-neutral-400 font-normal bg-neutral-100 px-1.5 py-0.5 rounded ml-1">
                                (추정)
                              </span>
                            </span>
                          ) : (
                            formatDateKorean(mRecord.date)
                          )}
                        </td>
                        <td className="py-4 font-medium text-neutral-600">
                          <span>데뷔 후 <strong className="text-black font-bold">+{daysTaken}일</strong> 만에 돌파{mRecord.isEstimated && <span className="text-[11px] text-neutral-400"> (추정)</span>}</span>
                        </td>
                        <td className="py-4 pr-4 text-right">
                          {mRecord.isEstimated ? (
                            <span className="inline-flex items-center px-3 py-1 rounded-full bg-neutral-100 text-neutral-500 text-[12px] font-bold border border-neutral-200">
                              추정치
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-[12px] font-bold border border-emerald-100">
                              정상 인증 완료
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  if (compareHeaderView && selectedForCompare.size > 0) {
    const selectedList = streamers
      .filter((s) => selectedForCompare.has(s.channelId))
      .sort((a, b) => (b.followerCount ?? 0) - (a.followerCount ?? 0));

    return (
      <div className="max-w-[1280px] mx-auto px-6 py-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => setCompareHeaderView(false)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white border border-hairline hover:bg-neutral-50 text-neutral-800 text-[14px] font-bold transition-all shadow-sm active:scale-95 w-fit"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>카드 목록으로 돌아가기</span>
          </button>
          <div className="font-mono text-[11px] font-bold tracking-mono text-neutral-400 uppercase">
            SELECTED HEADERS · {selectedList.length} STREAMERS
          </div>
        </div>

        <div className="space-y-8">
          {selectedList.map((streamer) => (
            <div key={streamer.channelId} className="relative">
              {renderStreamerProfileHeader(streamer)}
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={() => handleSelectStreamer(streamer.channelId)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-black text-white text-[13px] font-bold hover:bg-neutral-900 transition-colors"
                >
                  <span>{streamer.channelName} 전체 프로필 보기</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Hero Poster Section - Shown only on the main dashboard */}
      <section className="bg-white flex flex-col items-center text-center px-6 pt-[96px] pb-[48px] max-w-[1280px] mx-auto w-full">
        <span className="font-mono text-[12px] font-bold tracking-mono uppercase text-neutral-500 mb-6">
          CHZZK CREATOR MILESTONES
        </span>
        <h1 className="font-sans text-[48px] md:text-[86px] leading-[1.05] font-bold tracking-display-xl max-w-[1000px] mb-8 break-keep">
          방송의 시간, 팬의 마음,<br className="sm:hidden" /> 그리고 모든 특별한 날
        </h1>
        <div className="font-sans text-[18px] md:text-[20px] font-light leading-[1.45] text-neutral-800 max-w-[680px] mb-10 break-keep space-y-4">
          <p>
            치지직 크리에이터의 누적 방송 시간, 팔로워 성장, 생일과 데뷔 기념일까지 한눈에 확인할 수 있는 마일스톤 대시보드입니다.
          </p>
          <p>
            1,000시간마다, 1만 팔로워마다, 데뷔 100일과 n주년마다 찾아오는 특별한 순간을 기록하고 함께 축하합니다.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-4 mb-4">
          <a
            href="#dashboard-content"
            className="h-[44px] px-6 rounded-full bg-black text-white text-[16px] font-medium flex items-center justify-center hover:bg-neutral-900 transition-all"
          >
            트래커 대시보드 시작하기
          </a>
          <a
            href="#milestones"
            className="h-[44px] px-6 rounded-full bg-white text-black text-[16px] font-medium flex items-center justify-center border border-hairline hover:bg-neutral-50 transition-all"
          >
            최근 돌파 내역
          </a>
        </div>
      </section>

      <div id="dashboard-content" className="border-t border-hairline bg-neutral-50/50 py-12">
        <div className="max-w-[1280px] mx-auto px-6">
          {groupFilterBar}

          {/* Infinite Marquee Slider section - Placed directly at the top of the dashboard */}
          <div className="mb-14 border-t border-b border-hairline pt-8 pb-4 bg-white overflow-hidden">
            <div className="text-center mb-4">
              <span className="font-mono text-[11px] font-bold tracking-mono text-neutral-400 uppercase">
                TRACKED STREAMERS
              </span>
              <h3 className="font-sans text-[18px] font-bold text-black mt-1">
                추적 중인 스트리머
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 items-stretch gap-4 lg:gap-5 max-w-[1400px] mx-auto mb-8 px-4">
              {renderChaserColumn(
                topFollowerChasersByWeight,
                "Follow · Weighted",
                <Users className="w-4 h-4" />,
                (entry) => (
                  <>
                    {formatFollowerMilestoneTarget(entry.stats.nextMilestone)}까지{" "}
                    <strong className="text-black">{entry.stats.weightedRemainingPercent.toFixed(1)}%</strong>{" "}
                    <span className="text-neutral-500">(가중)</span>
                    <span className="text-neutral-400"> · {entry.stats.followersRemaining.toLocaleString()}명</span>
                  </>
                )
              )}
              {renderChaserColumn(
                topFollowerChasersByCount,
                "Follow · Count",
                <Users className="w-4 h-4" />,
                (entry) => (
                  <>
                    {formatFollowerMilestoneTarget(entry.stats.nextMilestone)}까지{" "}
                    <strong className="text-black">{entry.stats.followersRemaining.toLocaleString()}명</strong> 남음
                  </>
                )
              )}
              {renderChaserColumn(
                topHoursChasers,
                "Hours",
                <Trophy className="w-4 h-4" />,
                (entry) => (
                  <>
                    {entry.stats.nextMilestone.toLocaleString()}시간까지{" "}
                    <strong className="text-black">{entry.stats.hoursRemaining.toLocaleString()}시간</strong> 남음
                  </>
                )
              )}
              {renderChaserColumn(
                topDebutAnniversaryChasers,
                "Debut · Anniversary",
                <Calendar className="w-4 h-4" />,
                (entry) =>
                  entry.event.daysUntil === 0 ? (
                    <>
                      <strong className="text-black">{entry.event.label}</strong>
                      <span className="text-neutral-500"> · {entry.event.dLabel}</span>
                      <span className="text-neutral-400"> · 오늘</span>
                    </>
                  ) : (
                    <>
                      <strong className="text-black">{entry.event.label}</strong>
                      <span className="text-neutral-500"> · {entry.event.dLabel}</span>
                      <span className="text-neutral-400"> · {entry.event.daysUntil}일 후</span>
                    </>
                  )
              )}
            </div>

            <div className="relative w-full flex pt-4 pb-10 overflow-hidden">
              {filteredStreamers.length === 0 ? (
                <p className="w-full text-center py-6 text-neutral-500 font-sans text-[14px]">
                  선택한 소속에 해당하는 스트리머가 없습니다.
                </p>
              ) : (
              <div className="animate-marquee flex gap-10 items-center">
                {/* Duplicated to create seamless loop. Circles only, sliding infinitely! */}
            {[...filteredStreamers, ...filteredStreamers, ...filteredStreamers, ...filteredStreamers].map((streamer, idx) => (
              <div
                key={idx}
                className="relative group cursor-pointer flex-shrink-0"
                onClick={() => handleSelectStreamer(streamer.channelId)}
              >
                    {/* Infinite marquee profiles display: Clean, sleek circles with custom hover effects */}
                    <div className="relative aspect-square h-[84px] w-[84px] overflow-hidden rounded-full border-4 border-white bg-neutral-100 shadow-md transition-all duration-300 group-hover:scale-110 group-active:scale-95">
                      <StreamerChannelImage
                        src={streamer.channelImageUrl}
                        alt={streamer.channelName}
                        variant="thumb"
                      />
                    </div>
                    {/* Micro tooltip label showing name on hover */}
                    <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] font-bold font-sans px-2.5 py-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 pointer-events-none">
                      {streamer.channelName} {streamer.followerCount !== undefined && `(${formatFollowers(streamer.followerCount)})`}
                    </div>
                  </div>
                ))}
              </div>
              )}
            </div>
          </div>

      <section className="relative z-[1] rounded-[28px] sm:rounded-[36px] border border-slate-200/80 card-board-backdrop p-4 sm:p-6 lg:p-8 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <span className="font-mono text-[12px] font-bold tracking-mono text-neutral-400 uppercase">
            STREAMERS CARD BOARD
          </span>
          <h2 className="font-sans text-[32px] font-bold tracking-display-lg mt-1 text-black">
            스트리머 프로필 카드
          </h2>
          <p className="font-sans text-[14px] text-neutral-500 mt-1">
            카드를 클릭하면 전용 페이지로 이동합니다. 카드 우측 체크로 여러 명을 선택한 뒤 헤더만 비교할 수 있습니다.
          </p>
        </div>
        <div className="flex flex-col items-end gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping" />
            <span className="font-mono text-[11px] font-bold tracking-mono uppercase text-emerald-600">
              Realtime SWR Hourly Auto Scraping
            </span>
          </div>
          {selectedForCompare.size > 0 && (
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setCompareHeaderView(true)}
                className="px-4 py-2 rounded-full bg-black text-white text-[13px] font-bold hover:bg-neutral-900 transition-colors"
              >
                선택 헤더 보기 ({selectedForCompare.size})
              </button>
              <button
                type="button"
                onClick={() => setSelectedForCompare(new Set())}
                className="px-4 py-2 rounded-full bg-white border border-hairline text-neutral-700 text-[13px] font-bold hover:bg-neutral-50 transition-colors"
              >
                선택 해제
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="font-mono text-[11px] font-bold tracking-mono text-neutral-400 uppercase mr-1">
          정렬
        </span>
        <button
          type="button"
          onClick={() => toggleCardSort("hours")}
          className={`inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full border text-[13px] font-bold transition-colors ${
            cardSortField === "hours"
              ? "bg-black text-white border-black"
              : "bg-white text-neutral-700 border-hairline hover:bg-neutral-50"
          }`}
        >
          <Trophy className="w-3.5 h-3.5" />
          방송시간
          {cardSortField === "hours" && (cardSortDir === "desc" ? <ArrowDown className="w-3.5 h-3.5" /> : <ArrowUp className="w-3.5 h-3.5" />)}
        </button>
        <button
          type="button"
          onClick={() => toggleCardSort("followers")}
          className={`inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full border text-[13px] font-bold transition-colors ${
            cardSortField === "followers"
              ? "bg-black text-white border-black"
              : "bg-white text-neutral-700 border-hairline hover:bg-neutral-50"
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          팔로워
          {cardSortField === "followers" && (cardSortDir === "desc" ? <ArrowDown className="w-3.5 h-3.5" /> : <ArrowUp className="w-3.5 h-3.5" />)}
        </button>
        <button
          type="button"
          onClick={() => toggleCardSort("debut")}
          className={`inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full border text-[13px] font-bold transition-colors ${
            cardSortField === "debut"
              ? "bg-black text-white border-black"
              : "bg-white text-neutral-700 border-hairline hover:bg-neutral-50"
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          데뷔일
          {cardSortField === "debut" && (cardSortDir === "desc" ? <ArrowDown className="w-3.5 h-3.5" /> : <ArrowUp className="w-3.5 h-3.5" />)}
        </button>
        {cardSortField && (
          <button
            type="button"
            onClick={() => {
              setCardSortField(null);
              setCardSortDir("desc");
            }}
            className="inline-flex items-center h-9 px-3.5 rounded-full border border-hairline bg-white text-neutral-500 text-[13px] font-bold hover:bg-neutral-50 transition-colors"
          >
            기본
          </button>
        )}
      </div>

      {/* Streamer profile card grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        {sortedStreamers.map((streamer) => {
          const cardPalette = getCardSurfacePalette(streamer, extractedPalettes);
          const debutRef = getDebutReferenceDate(streamer.channelId, streamer.firstLiveDate);
          const debutDPlus = formatDebutDPlus(debutRef);
          const debutElapsed = formatDebutElapsed(debutRef);
          const birthdayMmDd = getStreamerBirthday(streamer.channelId);
          const birthdayLabel = birthdayMmDd ? formatBirthdayLabel(birthdayMmDd) : "";
          const isSelected = selectedForCompare.has(streamer.channelId);

          return (
            <div
              key={streamer.channelId}
              onClick={() => handleSelectStreamer(streamer.channelId)}
              className="w-full min-w-0 cursor-pointer hover:-translate-y-1.5 transition-transform duration-300"
            >
              <div
                className={`relative w-full h-full rounded-[20px] sm:rounded-[24px] border p-3 sm:p-4 lg:p-5 flex flex-col gap-3 sm:gap-4 hover:shadow-xl transition-all duration-300 overflow-hidden glass-card-surface border-white/70 ${
                  isSelected ? "ring-2 ring-black ring-offset-2" : ""
                }`}
                style={getGlassCardStyle(cardPalette)}
              >
                <div className="pointer-events-none absolute inset-0 rounded-[inherit] bg-gradient-to-br from-white/18 via-transparent to-white/5" />
                <div className="absolute top-2.5 sm:top-3 left-2.5 sm:left-3 right-11 sm:right-12 z-10">
                  {renderCardMilestoneBadges(streamer)}
                </div>
                <button
                  type="button"
                  aria-label={`${streamer.channelName} 비교 선택`}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleCompareSelection(streamer.channelId);
                  }}
                  className={`absolute top-2.5 sm:top-3 right-2.5 sm:right-3 z-10 shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 flex items-center justify-center transition-all shadow-sm ${
                    isSelected
                      ? "bg-black border-black text-white"
                      : "bg-white/90 border-hairline text-transparent hover:text-neutral-300 hover:border-neutral-400"
                  }`}
                >
                  <Check className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${isSelected ? "opacity-100" : "opacity-0"}`} />
                </button>

                <div className="relative z-10 flex justify-center pt-7 sm:pt-8">
                  <div className="relative aspect-square w-[120px] h-[120px] sm:w-[132px] sm:h-[132px] shrink-0 overflow-hidden rounded-full bg-neutral-200/70 border border-hairline group">
                    <StreamerChannelImage
                      src={streamer.channelImageUrl}
                      alt={streamer.channelName}
                      variant="card"
                      className="transition-transform duration-500 md:group-hover:scale-[1.03]"
                    />
                  </div>
                </div>

                <div className="relative z-10 space-y-1 min-w-0 flex-1">
                  <div className="min-w-0">
                    <h3 className="font-sans text-[15px] sm:text-[20px] lg:text-[22px] font-bold text-black tracking-tight break-keep leading-tight">
                      {streamer.channelName}
                    </h3>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      {renderGroupTag(streamer.groupTag || getGroupTag(streamer.channelId))}
                      {streamer.followerCount !== undefined && (
                        <span className="font-mono text-[10px] font-bold text-neutral-500 flex items-center gap-1 bg-white/50 px-1.5 py-0.5 rounded-full border border-hairline-soft md:hidden">
                          <Users className="w-2.5 h-2.5 text-neutral-400 shrink-0" />
                          {formatFollowers(streamer.followerCount)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="hidden md:flex items-center justify-between gap-2 pt-1">
                    <span className="font-mono text-[10px] font-bold tracking-mono text-neutral-400 uppercase shrink-0">
                      CHZZK STREAMER
                    </span>
                    {streamer.followerCount !== undefined && (
                      <span className="font-mono text-[11px] font-bold text-neutral-500 flex items-center gap-1 bg-white/50 px-2 py-0.5 rounded-full border border-hairline-soft truncate">
                        <Users className="w-3 h-3 text-neutral-400 shrink-0" />
                        {formatFollowers(streamer.followerCount)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="relative z-10 border-t border-white/40 pt-3 md:pt-4 flex flex-col gap-2 min-w-0 mt-auto">
                  <div className="min-w-0">
                    <span className="font-mono text-[10px] tracking-mono text-neutral-400 block uppercase mb-1.5">
                      TOTAL HOURS
                    </span>
                    <StatCounter value={streamer.totalLiveHours} size="sm" className="md:hidden" />
                    <StatCounter value={streamer.totalLiveHours} size="md" className="hidden md:block" />
                  </div>
                  {streamer.followerCount !== undefined && (
                    <div className="min-w-0">
                      <span className="font-mono text-[10px] tracking-mono text-neutral-400 block uppercase mb-1.5">
                        FOLLOWERS
                      </span>
                      <StatCounter value={streamer.followerCount} size="sm" className="md:hidden" />
                      <StatCounter value={streamer.followerCount} size="md" className="hidden md:block" />
                    </div>
                  )}
                  {debutDPlus && (
                    <div className="min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="font-mono text-[10px] tracking-mono text-neutral-400 uppercase">
                          DEBUT
                        </span>
                        {birthdayLabel && (
                          <span
                            className="font-mono text-[10px] font-bold text-neutral-500 tabular-nums shrink-0"
                            suppressHydrationWarning
                          >
                            🎂 {birthdayLabel}
                          </span>
                        )}
                      </div>
                      {debutElapsed && (
                        <p className="font-sans text-[12px] font-bold text-neutral-600 mb-1" suppressHydrationWarning>
                          {debutElapsed}
                        </p>
                      )}
                      <p
                        className="font-mono font-bold tabular-nums tracking-tight text-black text-[18px] md:text-[24px] leading-none"
                        suppressHydrationWarning
                      >
                        {debutDPlus}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {sortedStreamers.length === 0 && (
        <div className="text-center py-16 text-neutral-500 font-sans text-[15px]">
          선택한 소속에 해당하는 스트리머가 없습니다.
        </div>
      )}
      </section>

      {/* Grid of Achievement logs - Separating Broadcast Hours and Followers */}
      <div id="milestones" className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-20">
        {/* Left Column: Broadcast Hours Milestones */}
        <div className="bg-white p-6 md:p-8 rounded-[24px] border border-hairline">
          <div className="flex items-center justify-between mb-8 border-b border-hairline pb-4">
            <div className="flex items-center gap-3">
              <Trophy className="w-6 h-6 text-black" />
              <h3 className="font-sans text-[20px] font-bold">최근 방송 시간 마일스톤 달성</h3>
            </div>
            <span className="font-mono text-[11px] font-bold tracking-mono text-neutral-400 uppercase">
              1,000H BOUNDARIES
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-hairline-soft">
                  <th className="pb-3 font-mono text-[11px] font-bold tracking-mono text-neutral-400 uppercase">
                    CREATOR
                  </th>
                  <th className="pb-3 font-mono text-[11px] font-bold tracking-mono text-neutral-400 uppercase text-center">
                    MILESTONE
                  </th>
                  <th className="pb-3 font-mono text-[11px] font-bold tracking-mono text-neutral-400 uppercase text-right">
                    ACHIEVED DATE
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline-soft">
                {(() => {
                  const resolvedList = milestones
                    .filter((log) => filteredChannelIds.has(log.channelId))
                    .filter((log) => !log.type || log.type === "hours")
                    .map((log) => {
                      const res = resolveMilestoneDateAndStatus(log);
                      return { ...log, date: res.date, isEstimated: res.isEstimated };
                    })
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .slice(0, 5);

                  if (resolvedList.length === 0) {
                    return (
                      <tr>
                        <td colSpan={3} className="py-8 text-center text-neutral-400 font-sans text-[14px]">
                          선택한 소속에 해당하는 최근 방송 시간 마일스톤이 없습니다.
                        </td>
                      </tr>
                    );
                  }

                  return resolvedList.map((log, index) => {
                    const matchingStreamer = streamers.find(s => s.channelId === log.channelId);
                    const displayImageUrl = log.channelImageUrl || matchingStreamer?.channelImageUrl;

                    return (
                      <tr
                        key={index}
                        onClick={() => {
                          if (matchingStreamer) {
                            handleSelectStreamer(log.channelId);
                          }
                        }}
                        className="group hover:bg-neutral-50/50 transition-colors cursor-pointer"
                      >
                        <td className="py-4 font-sans text-[15px] font-medium flex items-center gap-3">
                          <div className="relative aspect-square size-7 shrink-0 overflow-hidden rounded-full bg-neutral-100 border border-hairline">
                            {displayImageUrl ? (
                              <StreamerChannelImage
                                src={displayImageUrl}
                                alt={log.channelName}
                                variant="avatar"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-neutral-200 text-[10px]">
                                ⭐
                              </div>
                            )}
                          </div>
                          <span className="text-black font-semibold group-hover:text-neutral-900 transition-colors">
                            {log.channelName}
                          </span>
                        </td>
                        <td className="py-4 font-sans text-center">
                          <span className="inline-flex items-center px-3 py-1 rounded-full bg-yellow-50 text-yellow-800 text-[13px] font-bold border border-yellow-100 group-hover:bg-yellow-100/80 transition-colors">
                            {log.milestone.toLocaleString()}시간 🎉
                          </span>
                        </td>
                        <td className="py-4 font-mono text-[13px] text-neutral-500 text-right group-hover:text-neutral-700 transition-colors" suppressHydrationWarning>
                          {formatDateKorean(log.date)}
                          {log.isEstimated && (
                            <span className="text-[10px] text-neutral-400 font-normal bg-neutral-100 px-1 py-0.5 rounded ml-1">
                              (추정)
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Follower Milestones */}
        <div className="bg-white p-6 md:p-8 rounded-[24px] border border-hairline">
          <div className="flex items-center justify-between mb-8 border-b border-hairline pb-4">
            <div className="flex items-center gap-3">
              <Users className="w-6 h-6 text-black" />
              <h3 className="font-sans text-[20px] font-bold">최근 팔로워 마일스톤 달성</h3>
            </div>
            <span className="font-mono text-[11px] font-bold tracking-mono text-neutral-400 uppercase">
              10,000 F BOUNDARIES
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-hairline-soft">
                  <th className="pb-3 font-mono text-[11px] font-bold tracking-mono text-neutral-400 uppercase">
                    CREATOR
                  </th>
                  <th className="pb-3 font-mono text-[11px] font-bold tracking-mono text-neutral-400 uppercase text-center">
                    MILESTONE
                  </th>
                  <th className="pb-3 font-mono text-[11px] font-bold tracking-mono text-neutral-400 uppercase text-right">
                    ACHIEVED DATE
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline-soft">
                {(() => {
                  const resolvedList = milestones
                    .filter((log) => filteredChannelIds.has(log.channelId))
                    .filter((log) => log.type === "followers")
                    .map((log) => {
                      const res = resolveMilestoneDateAndStatus(log);
                      return { ...log, date: res.date, isEstimated: res.isEstimated };
                    })
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .slice(0, 5);

                  if (resolvedList.length === 0) {
                    return (
                      <tr>
                        <td colSpan={3} className="py-8 text-center text-neutral-400 font-sans text-[14px]">
                          선택한 소속에 해당하는 최근 팔로워 마일스톤이 없습니다.
                        </td>
                      </tr>
                    );
                  }

                  return resolvedList.map((log, index) => {
                    const matchingStreamer = streamers.find(s => s.channelId === log.channelId);
                    const displayImageUrl = log.channelImageUrl || matchingStreamer?.channelImageUrl;

                    return (
                      <tr
                        key={index}
                        onClick={() => {
                          if (matchingStreamer) {
                            handleSelectStreamer(log.channelId);
                          }
                        }}
                        className="group hover:bg-neutral-50/50 transition-colors cursor-pointer"
                      >
                        <td className="py-4 font-sans text-[15px] font-medium flex items-center gap-3">
                          <div className="relative aspect-square size-7 shrink-0 overflow-hidden rounded-full bg-neutral-100 border border-hairline">
                            {displayImageUrl ? (
                              <StreamerChannelImage
                                src={displayImageUrl}
                                alt={log.channelName}
                                variant="avatar"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-neutral-200 text-[10px]">
                                ⭐
                              </div>
                            )}
                          </div>
                          <span className="text-black font-semibold group-hover:text-neutral-900 transition-colors">
                            {log.channelName}
                          </span>
                        </td>
                        <td className="py-4 font-sans text-center">
                          <span className="inline-flex items-center px-3 py-1 rounded-full bg-indigo-50 text-indigo-800 text-[13px] font-bold border border-indigo-100 group-hover:bg-indigo-100/80 transition-colors">
                            {formatFollowers(log.milestone)} 🎉
                          </span>
                        </td>
                        <td className="py-4 font-mono text-[13px] text-neutral-500 text-right group-hover:text-neutral-700 transition-colors" suppressHydrationWarning>
                          {formatDateKorean(log.date)}
                          {log.isEstimated && (
                            <span className="text-[10px] text-neutral-400 font-normal bg-neutral-100 px-1 py-0.5 rounded ml-1">
                              (추정)
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
  );
}
