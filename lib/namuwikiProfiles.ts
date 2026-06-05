import profilesJson from "@/data/namuwiki-profiles.json";

export type NamuwikiProfile = {
  channelName: string;
  pageTitle: string;
  url: string;
  birthday: string | null;
};

const PROFILES = profilesJson.profiles as Record<string, NamuwikiProfile>;

export function getNamuwikiProfile(channelId: string): NamuwikiProfile | undefined {
  return PROFILES[channelId];
}

export function getNamuwikiUrl(channelId: string): string | undefined {
  return PROFILES[channelId]?.url;
}

export function getStreamerBirthday(channelId: string): string | undefined {
  const birthday = PROFILES[channelId]?.birthday;
  return birthday ?? undefined;
}

export function hasNamuwikiProfile(channelId: string): boolean {
  return Boolean(PROFILES[channelId]?.url);
}
