// Shared extraction logic (injected via browser CDP Runtime.evaluate)
export function extractFollowersScript() {
  return `(() => {
    const body = document.body.innerText;
    const followerMatch = body.match(/팔로워\\s*\\n?([\\d,]+)명/);
    const currentFollowers = followerMatch ? parseInt(followerMatch[1].replace(/,/g, ""), 10) : 0;
    const path = Array.from(document.querySelectorAll("path")).find(
      (p) => (p.getAttribute("stroke") || "") === "#2656db"
    );
    const d = path?.getAttribute("d") || "";
    const coords = [];
    const re = /([ML])(-?[\\d.]+),(-?[\\d.]+)/g;
    let m;
    while ((m = re.exec(d))) coords.push({ x: +m[2], y: +m[3] });
    if (coords.length < 2 || currentFollowers <= 0) {
      return JSON.stringify({ currentFollowers, followers: [] });
    }
    const tickDates = [
      ...new Set(
        Array.from(document.querySelectorAll("text"))
          .map((t) => t.textContent?.trim() || "")
          .filter((t) => /^\\d{2}\\.\\d{2}\\.\\d{2}$/.test(t))
      ),
    ]
      .map((label) => {
        const [yy, mm, dd] = label.split(".").map(Number);
        return new Date(2000 + yy, mm - 1, dd).getTime();
      })
      .sort((a, b) => a - b);
    const xMin = coords[0].x;
    const xMax = coords[coords.length - 1].x;
    const yBottom = Math.max(...coords.map((c) => c.y));
    const yTop = Math.min(...coords.map((c) => c.y));
    const ySpan = yBottom - yTop || 1;
    const startMs = tickDates[0] || Date.now() - 365 * 24 * 60 * 60 * 1000;
    const endMs = tickDates[tickDates.length - 1] || Date.now();
    const timeSpan = endMs - startMs || 1;
    const followers = [];
    for (let i = 0; i < coords.length; i++) {
      if (i % 2 !== 0 && i !== coords.length - 1) continue;
      const c = coords[i];
      const ratio = (c.x - xMin) / (xMax - xMin || 1);
      const ms = startMs + ratio * timeSpan;
      const value = Math.round(((yBottom - c.y) / ySpan) * currentFollowers);
      followers.push({ date: new Date(ms).toISOString().slice(0, 10), followers: Math.max(0, value) });
    }
    if (followers.length > 0) followers[followers.length - 1].followers = currentFollowers;
    return JSON.stringify({ currentFollowers, followers });
  })()`;
}

export function extractHoursScript(targetTotalHours) {
  return `(() => {
    const target = ${targetTotalHours};
    const rangeMatch = document.body.innerText.match(/(\\d{2}\\.\\d{2}\\.\\d{2})\\s*~\\s*(\\d{2}\\.\\d{2}\\.\\d{2})/);
    const yLabels = Array.from(document.querySelectorAll("text"))
      .map((t) => t.textContent?.trim() || "")
      .filter((t) => /^\\d+$/.test(t))
      .map(Number)
      .filter((n) => n >= 0 && n <= 2000);
    const yMax = Math.max(...yLabels, 80);
    const bars = Array.from(document.querySelectorAll("rect"))
      .map((r) => ({
        h: Number(r.getAttribute("height") || 0),
        w: Number(r.getAttribute("width") || 0),
        fill: r.getAttribute("fill") || "",
      }))
      .filter((r) => r.fill.includes("indigo") && r.h > 10 && r.h < 260 && r.w > 3);
    if (!rangeMatch || bars.length === 0) {
      return JSON.stringify({ weeklyHours: [], cumulativeHours: [], barCount: 0 });
    }
    const maxH = Math.max(...bars.map((b) => b.h), 1);
    const parse = (s) => {
      const [yy, mm, dd] = s.split(".").map(Number);
      return new Date(2000 + yy, mm - 1, dd).getTime();
    };
    const startMs = parse(rangeMatch[1]);
    const endMs = parse(rangeMatch[2]);
    const span = endMs - startMs || 1;
    const weeklyHours = bars.map((bar, index) => {
      const ratio = bars.length === 1 ? 1 : index / (bars.length - 1);
      const ms = startMs + ratio * span;
      return {
        date: new Date(ms).toISOString().slice(0, 10),
        weeklyHours: Math.round(((bar.h / maxH) * yMax) * 10) / 10,
      };
    });
    let sum = 0;
    const cumulativeHours = weeklyHours.map((w) => {
      sum += w.weeklyHours;
      return { date: w.date, hours: Math.round(sum) };
    });
    const last = cumulativeHours[cumulativeHours.length - 1]?.hours || 0;
    if (target > 0 && last > 0 && Math.abs(last - target) > 5) {
      const scale = target / last;
      for (let i = 0; i < cumulativeHours.length; i++) {
        cumulativeHours[i].hours = Math.round(cumulativeHours[i].hours * scale);
      }
      cumulativeHours[cumulativeHours.length - 1].hours = target;
    }
    return JSON.stringify({ weeklyHours, cumulativeHours, barCount: bars.length, range: rangeMatch[0] });
  })()`;
}
