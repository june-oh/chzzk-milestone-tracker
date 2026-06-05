import profilesJson from "@/data/namuwiki-profiles.json";
import { getDebutReferenceDate as getFallbackDebutDate } from "@/lib/streamerMeta";

export type NamuwikiProfile = {
  channelName: string;
  pageTitle: string | null;
  url: string | null;
  birthday: string | null;
  debutDate: string | null;
  source?: string;
};

const PROFILES = profilesJson.profiles as Record<string, NamuwikiProfile>;

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

/** Namuwiki debut first, then configured group/member debut, then API firstLiveDate. */
export function getDebutReferenceDate(channelId: string, firstLiveDate?: string): string | undefined {
  const namuDebut = getStreamerNamuwikiDebut(channelId);
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
