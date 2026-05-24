"use client";

import { useState, useEffect } from "react";
import confetti from "canvas-confetti";
import { Sparkles, Trophy, Calendar, Heart, Flame, ArrowRight, RotateCcw, ExternalLink, X, TrendingUp, ChevronLeft, Users } from "lucide-react";
import { CartesianGrid, Line, LineChart, ReferenceDot, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

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
  color: string;
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

const COLOR_MAP: Record<string, { bg: string; accent: string; text: string; rawHex: string }> = {
  lilac: { bg: "bg-[#f4ebff]", accent: "bg-[#a46cfc]", text: "text-[#692ec7]", rawHex: "#a46cfc" },
  pink: { bg: "bg-[#ffebeb]", accent: "bg-[#ff6c8f]", text: "text-[#d61c4e]", rawHex: "#ff6c8f" },
  mint: { bg: "bg-[#e1fbf4]", accent: "bg-[#10b981]", text: "text-[#047857]", rawHex: "#10b981" },
  coral: { bg: "bg-[#fff0eb]", accent: "bg-[#ff7a59]", text: "text-[#c2410c]", rawHex: "#ff7a59" },
  cream: { bg: "bg-[#fffbf0]", accent: "bg-[#fbbf24]", text: "text-[#b45309]", rawHex: "#fbbf24" },
  lime: { bg: "bg-[#e2fc52]/10", accent: "bg-[#e2fc52]", text: "text-[#4d5d03]", rawHex: "#b5db00" }, // Special style for signature figma lime
};

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

function FlipClock({ value, size = "normal" }: { value: number; size?: "normal" | "small" | "large" }) {
  // Pad total hours value with leading zeros and compute correct comma separators
  const numStr = String(value).padStart(5, "0");
  const chars: string[] = [];
  for (let i = 0; i < numStr.length; i++) {
    if (i > 0 && (numStr.length - i) % 3 === 0) {
      chars.push(",");
    }
    chars.push(numStr[i]);
  }

  return (
    <div className="flip-clock-container" onClick={(e) => {
      if (size === "large") {
        e.stopPropagation(); // Only block propagation on large active clock, not on small preview clocks so card clicks work!
      }
    }}>
      {chars.map((char, index) => {
        const isComma = char === ",";
        if (isComma) {
          return (
            <span
              key={index}
              className={`text-neutral-400 font-bold font-mono select-none self-end pb-1 ${
                size === "small" ? "text-[14px] px-0.5" : size === "large" ? "text-[32px] px-2 pb-3" : "text-[18px] px-1"
              }`}
            >
              ,
            </span>
          );
        }
        return (
          <div
            key={index}
            className={`flip-clock-digit ${
              size === "small" ? "flip-clock-digit-small" : size === "large" ? "flip-clock-digit-large" : ""
            }`}
          >
            <span className="flip-clock-digit-text">{char}</span>
            <div className="flip-clock-digit-crease" />
          </div>
        );
      })}
    </div>
  );
}

export default function ClientDashboard({ initialStreamers, initialMilestones }: ClientDashboardProps) {
  const [streamers, setStreamers] = useState<Streamer[]>(initialStreamers);
  const [milestones, setMilestones] = useState<Milestone[]>(initialMilestones);
  const [activeStreamerId, setActiveStreamerId] = useState<string | null>(null);
  const [hoveredHoursPointState, setHoveredHoursPoint] = useState<HoursChartPoint | null>(null);
  const [hoveredFollowersPointState, setHoveredFollowersPoint] = useState<FollowersChartPoint | null>(null);
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

  // Helper to resolve milestone dates and flag estimated status for those not verified in static fallbacks.
  // This avoids auto-created 20th May dates for other streamers from taking over the dashboard recent achievements lists.
  const resolveMilestoneDateAndStatus = (log: Milestone) => {
    const matchingStreamer = streamers.find(s => s.channelId === log.channelId);
    if (!matchingStreamer) {
      return { date: log.date, isEstimated: false };
    }

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
      { channelId: "65c3035bdc598c81f15a8fe0e958b3ce", milestone: 4000, type: "hours", date: "2026-04-15T09:00:00.000Z" }
    ];

    const type = log.type || "hours";
    const verified = verifiedMilestones.find(
      v => v.channelId === log.channelId && v.milestone === log.milestone && v.type === type
    );

    if (verified) {
      return { date: verified.date, isEstimated: false };
    }

    // Estimate using linear interpolation based on current stats and debut
    try {
      const startDate = parseSafeDate(matchingStreamer.firstLiveDate);
      const endDate = parseSafeDate(matchingStreamer.lastUpdated || new Date().toISOString());
      
      if (type === "hours") {
        const totalHours = matchingStreamer.totalLiveHours;
        if (totalHours > 0) {
          const timeSpan = endDate.getTime() - startDate.getTime();
          const msPerHour = timeSpan / totalHours;
          const estimatedMs = startDate.getTime() + (log.milestone * msPerHour);
          return { date: new Date(estimatedMs).toISOString(), isEstimated: true };
        }
      } else {
        const totalFollowers = matchingStreamer.followerCount || 0;
        if (totalFollowers > 0) {
          const timeSpan = endDate.getTime() - startDate.getTime();
          const msPerFollower = timeSpan / totalFollowers;
          const estimatedMs = startDate.getTime() + (log.milestone * msPerFollower);
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

  // Client-side hydration to pull absolute real-time metrics & trigger background SWR updates
  useEffect(() => {
    let active = true;
    async function fetchLatest() {
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
    }
    fetchLatest();
    return () => {
      active = false;
    };
  }, []);

  // Compute milestone variables
  const getMilestoneStats = (hours: number) => {
    const nextMilestone = Math.ceil((hours + 0.1) / 1000) * 1000;
    const progressPercent = ((hours % 1000) / 1000) * 100;
    const hoursRemaining = nextMilestone - hours;
    return { nextMilestone, progressPercent, hoursRemaining };
  };

  // Compile a comprehensive list of milestone achievements using exact recorded database dates or linear estimates
  const getStreamerMilestones = (streamer: Streamer) => {
    const milestoneCount = Math.floor(streamer.totalLiveHours / 1000);
    const list = [];

    for (let m = 1; m <= milestoneCount; m++) {
      const milestoneVal = m * 1000;

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
        // Fallback: estimate date using linear interpolation
        try {
          const startDate = parseSafeDate(streamer.firstLiveDate);
          const endDate = parseSafeDate(streamer.lastUpdated || new Date().toISOString());
          const totalHours = streamer.totalLiveHours;
          if (totalHours > 0) {
            const timeSpan = endDate.getTime() - startDate.getTime();
            const msPerHour = timeSpan / totalHours;
            const estimatedMs = startDate.getTime() + (milestoneVal * msPerHour);
            list.push({
              milestone: milestoneVal,
              date: new Date(estimatedMs).toISOString(),
              isEstimated: true,
            });
          }
        } catch (err) {
          console.warn("Milestone estimation failed:", err);
        }
      }
    }

    return list;
  };

  // Generate monotonically increasing curve data starting from (firstLiveDate, 0)
  const getFullHistoryData = (streamer: Streamer, streamerMilestones: { milestone: number; date: string }[]) => {
    const points: { date: Date; hours: number; label: string; isMilestone: boolean }[] = [];

    if (streamer.firstLiveDate) {
      points.push({
        date: parseSafeDate(streamer.firstLiveDate),
        hours: 0,
        label: "방송 시작일",
        isMilestone: false,
      });
    }

    streamerMilestones.forEach((m) => {
      points.push({
        date: parseSafeDate(m.date),
        hours: m.milestone,
        label: `${m.milestone.toLocaleString()}시간 돌파`,
        isMilestone: true,
      });
    });

    if (streamer.history && streamer.history.length > 0) {
      streamer.history.forEach((h) => {
        points.push({
          date: parseSafeDate(h.date),
          hours: h.hours,
          label: `${h.hours.toLocaleString()}시간`,
          isMilestone: false,
        });
      });
    }

    points.sort((a, b) => a.date.getTime() - b.date.getTime());

    const uniquePoints: typeof points = [];
    let lastHours = -1;
    points.forEach((p) => {
      if (p.hours >= lastHours) {
        const dateKey = formatDateShort(p.date);
        const existingIdx = uniquePoints.findIndex(
          (up) => formatDateShort(up.date) === dateKey
        );
        if (existingIdx !== -1) {
          if (p.isMilestone) {
            uniquePoints[existingIdx] = p;
          }
        } else {
          uniquePoints.push(p);
          lastHours = p.hours;
        }
      }
    });

    return uniquePoints;
  };

  // Compile a comprehensive list of follower milestone achievements (every 10,000 followers)
  const getStreamerFollowerMilestones = (streamer: Streamer) => {
    const followerCount = streamer.followerCount || 0;
    const milestoneCount = Math.floor(followerCount / 10000);
    const exactRecords = milestones
      .filter(
        (rec) =>
          rec.channelId === streamer.channelId &&
          rec.type === "followers" &&
          rec.milestone > 0
      )
      .map((rec) => ({
        milestone: rec.milestone,
        date: rec.date,
      }));

    const anchors = [
      ...(streamer.firstLiveDate ? [{ milestone: 0, date: streamer.firstLiveDate }] : []),
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
          isEstimated: true,
        });
      } catch (err) {
        console.warn("Follower milestone estimation failed:", err);
      }
    }

    return list;
  };

  // Generate monotonically increasing curve data starting from (firstLiveDate, 0) for followers
  const getFullFollowerHistoryData = (streamer: Streamer, followerMilestones: { milestone: number; date: string }[]) => {
    const points: { date: Date; followers: number; label: string; isMilestone: boolean }[] = [];

    if (streamer.firstLiveDate) {
      points.push({
        date: parseSafeDate(streamer.firstLiveDate),
        followers: 0,
        label: "방송 시작일",
        isMilestone: false,
      });
    }

    followerMilestones.forEach((m) => {
      points.push({
        date: parseSafeDate(m.date),
        followers: m.milestone,
        label: `${formatFollowers(m.milestone)} 돌파`,
        isMilestone: true,
      });
    });

    if (streamer.history && streamer.history.length > 0) {
      streamer.history.forEach((h) => {
        const hFollowers = h.followers !== undefined ? h.followers : (streamer.followerCount || 0);
        points.push({
          date: parseSafeDate(h.date),
          followers: hFollowers,
          label: `${formatFollowers(hFollowers)}`,
          isMilestone: false,
        });
      });
    }

    points.sort((a, b) => a.date.getTime() - b.date.getTime());

    const uniquePoints: typeof points = [];
    let lastFollowers = -1;
    points.forEach((p) => {
      if (p.followers >= lastFollowers) {
        const dateKey = formatDateShort(p.date);
        const existingIdx = uniquePoints.findIndex(
          (up) => formatDateShort(up.date) === dateKey
        );
        if (existingIdx !== -1) {
          if (p.isMilestone) {
            uniquePoints[existingIdx] = p;
          }
        } else {
          uniquePoints.push(p);
          lastFollowers = p.followers;
        }
      }
    });

    return uniquePoints;
  };

  // Helper date utilities
  const formatDateKorean = (dateStr: string) => {
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

  const formatDateShort = (dateStr: string | Date) => {
    try {
      const d = parseSafeDate(dateStr);
      return `${String(d.getFullYear()).slice(2)}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    } catch {
      return "";
    }
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
    const chartPoints = getFullHistoryData(streamer, streamerMilestones);

    if (chartPoints.length < 2) return null;

    const chartColorSet = COLOR_MAP[streamer.color] || COLOR_MAP.lime;
    const chartMaxHours = Math.ceil((streamer.totalLiveHours + 1) / 1000) * 1000;
    const hourTicks = Array.from({ length: Math.floor(chartMaxHours / 1000) + 1 }, (_, index) => index * 1000);
    const chartData = chartPoints.map((p) => ({
      timestamp: p.date.getTime(),
      date: formatDateShort(p.date),
      fullDate: formatDateFull(p.date),
      hours: p.hours,
      label: p.label,
      isMilestone: p.isMilestone,
    }));

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
              tickFormatter={(value) => formatDateShort(new Date(Number(value)))}
              tick={{ fontSize: 11, fontFamily: "monospace", fontWeight: 700, fill: "#737373" }}
              tickMargin={12}
              minTickGap={34}
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
            {chartData.filter((p) => p.isMilestone).map((p) => (
              <ReferenceDot
                key={`hours-${p.date}-${p.hours}`}
                x={p.timestamp}
                y={p.hours}
                ifOverflow="visible"
                r={5}
                fill="#ffffff"
                stroke={chartColorSet.rawHex}
                strokeWidth={3}
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

  const renderFullFollowerHistoryChart = (streamer: Streamer) => {
    const followerMilestones = getStreamerFollowerMilestones(streamer);
    const chartPoints = getFullFollowerHistoryData(streamer, followerMilestones);

    if (chartPoints.length < 2) return null;

    const chartColorSet = COLOR_MAP[streamer.color] || COLOR_MAP.lime;
    const chartMaxFollowers = Math.ceil((streamer.followerCount || 10000) / 10000) * 10000;
    const followerTicks = Array.from({ length: Math.floor(chartMaxFollowers / 10000) + 1 }, (_, index) => index * 10000);
    const chartData = chartPoints.map((p) => ({
      timestamp: p.date.getTime(),
      date: formatDateShort(p.date),
      fullDate: formatDateFull(p.date),
      followers: p.followers,
      label: p.label,
      isMilestone: p.isMilestone,
    }));

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
              tickFormatter={(value) => formatDateShort(new Date(Number(value)))}
              tick={{ fontSize: 11, fontFamily: "monospace", fontWeight: 700, fill: "#737373" }}
              tickMargin={12}
              minTickGap={34}
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
            {chartData.filter((p) => p.isMilestone).map((p) => (
              <ReferenceDot
                key={`followers-${p.date}-${p.followers}`}
                x={p.timestamp}
                y={p.followers}
                ifOverflow="visible"
                r={5}
                fill="#ffffff"
                stroke={chartColorSet.rawHex}
                strokeWidth={3}
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

  // If a streamer is selected, render their DEDICATED FULL-SCREEN PROFILE PAGE
  if (selectedStreamer) {
    const colorSet = COLOR_MAP[selectedStreamer.color] || COLOR_MAP.lime;
    const borderSet = BORDER_COLOR_MAP[selectedStreamer.color] || "border-neutral-200";
    const stats = getMilestoneStats(selectedStreamer.totalLiveHours);
    const streamerMilestones = getStreamerMilestones(selectedStreamer);

    return (
      <div className="max-w-[1040px] mx-auto px-6 py-4 animate-in fade-in slide-in-from-bottom-6 duration-300 relative">
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
        <div className="mb-8 flex items-center justify-between">
          <button
            onClick={() => {
              handleSelectStreamer(null);
            }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white border border-hairline hover:bg-neutral-50 text-neutral-800 text-[14px] font-bold transition-all shadow-sm active:scale-95"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>전체 스트리머 목록으로 돌아가기</span>
          </button>

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

        {/* 1. TOP SECTION: Streamer Header & Giant Flip Clock */}
        <div className={`rounded-[32px] border ${borderSet} ${colorSet.bg} p-8 md:p-12 mb-10 shadow-sm relative overflow-hidden`}>
          <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-8 relative z-10">
            {/* Left Streamer Avatar & Meta */}
            <div className="flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
              <div className="w-[110px] h-[110px] rounded-[24px] overflow-hidden border-4 border-white shadow-lg">
                <img
                  src={selectedStreamer.channelImageUrl}
                  alt={selectedStreamer.channelName}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-center md:justify-start gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${colorSet.accent}`} />
                  <span className="font-mono text-[12px] font-bold tracking-mono text-neutral-500 uppercase">
                    CHZZK PARTNER CREATOR
                  </span>
                </div>
                <h2 className="font-sans text-[36px] font-bold text-black tracking-tight leading-none">
                  {selectedStreamer.channelName}
                </h2>
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-[13px] text-neutral-600 font-medium mb-3">
                  <span className="flex items-center gap-1.5" suppressHydrationWarning>
                    <Calendar className="w-4 h-4 text-neutral-400" />
                    방송 시작: {formatDateKorean(selectedStreamer.firstLiveDate)}
                  </span>
                  <span className="bg-white/60 px-3 py-1 rounded-full text-[12px] border border-hairline-soft font-bold">
                    🥇 {selectedStreamer.lastMilestone.toLocaleString()}H 클럽 가입됨
                  </span>
                  {selectedStreamer.followerCount !== undefined && (
                    <span className="bg-white/60 px-3 py-1 rounded-full text-[12px] border border-hairline-soft font-bold flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-neutral-500" />
                      팔로워 {formatFollowers(selectedStreamer.followerCount)}
                    </span>
                  )}
                </div>

                {/* Next Milestone Remaining Indicator */}
                <div className="bg-white/85 border border-hairline-soft rounded-2xl p-4 max-w-[420px] text-left shadow-sm">
                  <div className="flex justify-between text-[11px] font-mono font-bold tracking-mono text-neutral-500 uppercase mb-1.5">
                    <span>PROGRESS TO {stats.nextMilestone.toLocaleString()}H</span>
                    <span>{stats.progressPercent.toFixed(1)}%</span>
                  </div>
                  <div className="w-full h-3 bg-neutral-200/50 rounded-full overflow-hidden border border-hairline-soft mb-2.5">
                    <div
                      className={`h-full ${colorSet.accent} transition-all duration-500`}
                      style={{ width: `${stats.progressPercent}%` }}
                    />
                  </div>
                  <p className="font-sans text-[13px] text-neutral-800 font-medium">
                    다음 마일스톤인 <strong className="text-black font-extrabold">{stats.nextMilestone.toLocaleString()}시간</strong>까지 <strong className="text-black font-extrabold text-[15px]">{stats.hoursRemaining.toLocaleString()}시간</strong> 남았습니다!
                  </p>
                </div>
              </div>
            </div>

            {/* Right GIANT FLIP CLOCK displaying hours */}
            <div className="flex flex-col items-center md:items-end gap-3 self-center">
              <span className="font-mono text-[11px] font-bold tracking-mono text-neutral-400 uppercase">
                TOTAL LIVE BROADCAST HOURS
              </span>
              <FlipClock value={selectedStreamer.totalLiveHours} size="large" />
            </div>
          </div>
        </div>

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
                  <span className={`w-3 h-1.5 rounded-full ${colorSet.accent}`} /> 성장 곡선
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
                  <span className={`w-3 h-1.5 rounded-full ${colorSet.accent}`} /> 성장 곡선
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

  return (
    <div className="w-full">
      {/* Hero Poster Section - Shown only on the main dashboard */}
      <section className="bg-white flex flex-col items-center text-center px-6 pt-[96px] pb-[48px] max-w-[1280px] mx-auto w-full">
        <span className="font-mono text-[12px] font-bold tracking-mono uppercase text-neutral-500 mb-6">
          LIVE STREAM TIME CELEBRATION
        </span>
        <h1 className="font-sans text-[48px] md:text-[86px] leading-[1.05] font-bold tracking-display-xl max-w-[1000px] mb-8 break-keep">
          열정의 기록,<br className="sm:hidden" /> 1000시간의 감동을 전합니다
        </h1>
        <p className="font-sans text-[18px] md:text-[20px] font-light leading-[1.45] text-neutral-800 max-w-[680px] mb-10 break-keep">
          치지직 크리에이터들의 누적 방송 시간을 하루 단위로 수집하여, 1,000시간을 돌파할 때마다 함께 기억하고 실시간으로 축하하는 대시보드 공간입니다.
        </p>
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
          {/* Infinite Marquee Slider section - Placed directly at the top of the dashboard */}
          <div className="mb-14 border-t border-b border-hairline pt-8 pb-4 bg-white overflow-hidden relative">
            <div className="absolute top-0 bottom-0 left-0 w-24 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
            <div className="absolute top-0 bottom-0 right-0 w-24 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />
            
            <div className="text-center mb-4">
              <span className="font-mono text-[11px] font-bold tracking-mono text-neutral-400 uppercase">
                TRACKED STREAMERS
              </span>
              <h3 className="font-sans text-[18px] font-bold text-black mt-1">
                추적 중인 스트리머
              </h3>
            </div>

            <div className="relative w-full flex pt-4 pb-10 overflow-hidden">
              <div className="animate-marquee flex gap-10 items-center">
                {/* Duplicated to create seamless loop. Circles only, sliding infinitely! */}
            {[...streamers, ...streamers, ...streamers, ...streamers].map((streamer, idx) => (
              <div
                key={idx}
                className="relative group cursor-pointer flex-shrink-0"
                onClick={() => handleSelectStreamer(streamer.channelId)}
              >
                    {/* Infinite marquee profiles display: Clean, sleek circles with custom hover effects */}
                    <div className={`w-[84px] h-[84px] rounded-full overflow-hidden border-4 border-white shadow-md transition-all duration-300 group-hover:scale-110 group-active:scale-95 group-hover:border-${streamer.color}`}>
                      <img
                        src={streamer.channelImageUrl}
                        alt={streamer.channelName}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    {/* Micro tooltip label showing name on hover */}
                    <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] font-bold font-sans px-2.5 py-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 pointer-events-none">
                      {streamer.channelName} {streamer.followerCount !== undefined && `(${formatFollowers(streamer.followerCount)})`}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
        <div>
          <span className="font-mono text-[12px] font-bold tracking-mono text-neutral-400 uppercase">
            STREAMERS CARD BOARD
          </span>
          <h2 className="font-sans text-[32px] font-bold tracking-display-lg mt-1 text-black">
            스트리머 프로필 카드
          </h2>
          <p className="font-sans text-[14px] text-neutral-500 mt-1">
            원하는 스트리머의 프로필 카드를 클릭하면, **해당 크리에이터 전용 페이지**로 이동하여 큰 화면에서 대형 플립 시계와 전체 역사 그래프를 보실 수 있습니다.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping" />
          <span className="font-mono text-[11px] font-bold tracking-mono uppercase text-emerald-600">
            Realtime SWR Hourly Auto Scraping
          </span>
        </div>
      </div>

      {/* 3D Flip Card Grid (Clicking triggers entering dedicated page) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {streamers.map((streamer) => {
          const colorSet = COLOR_MAP[streamer.color] || COLOR_MAP.lime;
          const borderSet = BORDER_COLOR_MAP[streamer.color] || "border-neutral-200";

          return (
            <div
              key={streamer.channelId}
              onClick={() => handleSelectStreamer(streamer.channelId)}
              className="w-full h-[400px] cursor-pointer hover:-translate-y-1.5 transition-transform duration-300"
            >
              <div
                className={`w-full h-full rounded-[24px] border ${borderSet} ${colorSet.bg} p-6 flex flex-col justify-between hover:shadow-lg transition-shadow`}
              >
                {/* Top Image & Badge */}
                <div className="space-y-4">
                  <div className="relative w-full h-[180px] rounded-xl overflow-hidden bg-neutral-100 border border-hairline group">
                    <img
                      src={streamer.channelImageUrl}
                      alt={streamer.channelName}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute top-3 left-3 bg-black text-white px-3 py-1 rounded-full text-[11px] font-bold font-mono tracking-mono uppercase flex items-center gap-1.5 shadow-sm">
                      <Trophy className="w-3 h-3 text-yellow-400" />
                      <span>{streamer.lastMilestone.toLocaleString()}H CLUB</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] font-bold tracking-mono text-neutral-400 block uppercase">
                        CHZZK STREAMER
                      </span>
                      {streamer.followerCount !== undefined && (
                        <span className="font-mono text-[11px] font-bold text-neutral-500 flex items-center gap-1 bg-white/50 px-2 py-0.5 rounded-full border border-hairline-soft">
                          <Users className="w-3 h-3 text-neutral-400" />
                          {formatFollowers(streamer.followerCount)}
                        </span>
                      )}
                    </div>
                    <h3 className="font-sans text-[24px] font-bold text-black tracking-tight">
                      {streamer.channelName}
                    </h3>
                  </div>
                </div>

                {/* Front Footer info: Small Flip Clock */}
                <div className="border-t border-hairline pt-4 flex items-center justify-between">
                  <div>
                    <span className="font-mono text-[10px] tracking-mono text-neutral-400 block uppercase mb-2">
                      TOTAL HOURS
                    </span>
                    <FlipClock value={streamer.totalLiveHours} size="small" />
                  </div>

                  {/* Styled pill indicator */}
                  <div className="h-[40px] w-[40px] rounded-full bg-black text-white hover:bg-neutral-900 flex items-center justify-center transition-colors self-end shadow-sm">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

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
                    .filter(log => !log.type || log.type === "hours")
                    .map(log => {
                      const res = resolveMilestoneDateAndStatus(log);
                      return { ...log, date: res.date, isEstimated: res.isEstimated };
                    })
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .slice(0, 5);

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
                          <div className="w-7 h-7 rounded-md overflow-hidden bg-neutral-100 border border-hairline flex-shrink-0">
                            {displayImageUrl ? (
                              <img
                                src={displayImageUrl}
                                alt={log.channelName}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[10px] bg-neutral-200">
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
                    .filter(log => log.type === "followers")
                    .map(log => {
                      const res = resolveMilestoneDateAndStatus(log);
                      return { ...log, date: res.date, isEstimated: res.isEstimated };
                    })
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .slice(0, 5);

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
                          <div className="w-7 h-7 rounded-md overflow-hidden bg-neutral-100 border border-hairline flex-shrink-0">
                            {displayImageUrl ? (
                              <img
                                src={displayImageUrl}
                                alt={log.channelName}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[10px] bg-neutral-200">
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
