/** Safe merge helpers — never replace denser manual/CDP history with sparse Playwright scrapes. */

export const MANUAL_SOURCES = new Set(["manual", "browser-cdp", "cdp"]);

export function isProtectedEntry(entry) {
  if (!entry) return false;
  if (entry.meta?.locked === true) return true;
  return MANUAL_SOURCES.has(entry.meta?.source);
}

export function seriesLength(entry) {
  if (!entry) return { followers: 0, hours: 0 };
  return {
    followers: entry.followers?.length ?? 0,
    hours: entry.cumulativeHours?.length ?? 0,
  };
}

export function hasCompleteHistory(entry) {
  if (!entry || entry.meta?.error) return false;
  const { followers, hours } = seriesLength(entry);
  return followers > 0 && hours > 0;
}

/** Skip automated scrape when existing data should be kept as-is. */
export function shouldSkipScrape(existing, { force = false } = {}) {
  if (force || !existing) return false;
  if (isProtectedEntry(existing)) return true;
  if (hasCompleteHistory(existing)) return true;
  return false;
}

function mergePointsPreferExisting(existing = [], incoming = [], valueKey) {
  const byDate = new Map();
  for (const point of existing) byDate.set(point.date, point);
  for (const point of incoming) {
    if (!byDate.has(point.date)) byDate.set(point.date, point);
  }
  return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
}

function pickSeries(existing = [], incoming = [], valueKey) {
  if (existing.length === 0) return incoming;
  if (incoming.length === 0) return existing;
  if (existing.length >= incoming.length) return existing;
  return mergePointsPreferExisting(existing, incoming, valueKey);
}

/**
 * Merge scraped payload into existing channel entry.
 * Manual/protected entries are never modified unless force=true.
 * For partial overlaps, keep the series with more data points.
 */
export function mergeSoftconChannel(existing, incoming, { source = "playwright", force = false } = {}) {
  if (!incoming) return { entry: existing, action: "noop" };

  if (!force && shouldSkipScrape(existing)) {
    return { entry: existing, action: "skipped-protected" };
  }

  if (!existing) {
    return {
      entry: {
        ...incoming,
        meta: { ...incoming.meta, source, scrapedAt: incoming.meta?.scrapedAt ?? new Date().toISOString() },
      },
      action: "inserted",
    };
  }

  const followers = pickSeries(existing.followers, incoming.followers, "followers");
  const weeklyHours = pickSeries(existing.weeklyHours, incoming.weeklyHours, "weeklyHours");
  const cumulativeHours = pickSeries(existing.cumulativeHours, incoming.cumulativeHours, "hours");

  const useExistingFollowers = (existing.followers?.length ?? 0) >= (incoming.followers?.length ?? 0);
  const useExistingHours = (existing.cumulativeHours?.length ?? 0) >= (incoming.cumulativeHours?.length ?? 0);

  return {
    entry: {
      followers: useExistingFollowers ? existing.followers : followers,
      weeklyHours: useExistingHours ? existing.weeklyHours ?? weeklyHours : weeklyHours,
      cumulativeHours: useExistingHours ? existing.cumulativeHours : cumulativeHours,
      currentFollowers: useExistingFollowers
        ? existing.currentFollowers ?? incoming.currentFollowers
        : incoming.currentFollowers ?? existing.currentFollowers,
      meta: {
        ...incoming.meta,
        ...existing.meta,
        source: existing.meta?.source ?? source,
        lastMergedAt: new Date().toISOString(),
      },
    },
    action: "merged",
  };
}

/** Tag entries that look hand-collected (dense daily followers and/or hours). */
export function tagManualEntries(db, { minFollowers = 15, minHours = 15 } = {}) {
  let tagged = 0;
  for (const id of Object.keys(db)) {
    const entry = db[id];
    if (!entry || isProtectedEntry(entry)) continue;
    const { followers, hours } = seriesLength(entry);
    if (followers >= minFollowers || hours >= minHours) {
      entry.meta = { ...entry.meta, source: "manual", locked: true };
      tagged++;
    }
  }
  return tagged;
}

export function cleanupEmptyEntries(output, { force = false } = {}) {
  let removed = 0;
  for (const id of Object.keys(output)) {
    const entry = output[id];
    if (!force && isProtectedEntry(entry)) continue;
    if (!hasCompleteHistory(entry)) {
      delete output[id];
      removed++;
    }
  }
  return removed;
}
