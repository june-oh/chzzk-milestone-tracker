import profilesJson from "@/data/namuwiki-profiles.json";
import {
  getConfiguredDebutDate,
  getDebutReferenceDate as getFallbackDebutDate,
} from "@/lib/streamerMeta";

export type NamuwikiProfile = {
  channelName: string;
  pageTitle: string | null;
  url: string | null;
  birthday: string | null;
  debutDate: string | null;
  source?: string;
};

const PROFILES = profilesJson.profiles as Record<string, NamuwikiProfile>;

function isManualProfile(profile: NamuwikiProfile | undefined): boolean {
  return profile?.source === "manual" || Boolean(profile?.source?.startsWith("manual"));
}

export function getNamuwikiProfile(channelId: string): NamuwikiProfile | undefined {
  return PROFILES[channelId];
}

export function getNamuwikiUrl(channelId: string): string | undefined {
  const url = PROFILES[channelId]?.url;
  return url ?? undefined;
}

export function getStreamerBirthday(channelId: string): string | undefined {
  const birthday = PROFILES[channelId]?.birthday;
  return birthday ?? undefined;
}

export function getStreamerNamuwikiDebut(channelId: string): string | undefined {
  const debutDate = PROFILES[channelId]?.debutDate;
  return debutDate ?? undefined;
}

/**
 * Debut date for D+ / anniversaries:
 * 1. Verified manual namuwiki
 * 2. Group / per-member configured debut
 * 3. Namuwiki scraped debut
 * 4. Chzzk firstLiveDate fallback
 */
export function getDebutReferenceDate(channelId: string, firstLiveDate?: string): string | undefined {
  const profile = getNamuwikiProfile(channelId);

  if (isManualProfile(profile) && profile?.debutDate) {
    return profile.debutDate;
  }

  const configured = getConfiguredDebutDate(channelId);
  if (configured) return configured;

  const namuDebut = profile?.debutDate;
  if (namuDebut) return namuDebut;

  return getFallbackDebutDate(channelId, firstLiveDate);
}

export function formatBirthdayLabel(birthdayMmDd: string): string {
  const [month, day] = birthdayMmDd.split("-").map(Number);
  if (!month || !day) return birthdayMmDd;
  return `${month}/${day}`;
}

export function hasNamuwikiProfile(channelId: string): boolean {
  return Boolean(PROFILES[channelId]?.url);
}
