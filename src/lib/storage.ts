import { dedupeBy, normalizeBaseUrl, tryParseJson } from "@/lib/utils";
import type { ConnectionProfile } from "@/lib/types";

const STORAGE_KEY = "signal-rest-ui/state";

export interface PersistedState {
  profiles: ConnectionProfile[];
  activeProfileId?: string;
  activeAccounts: Record<string, string>;
}

export const emptyPersistedState: PersistedState = {
  profiles: [],
  activeAccounts: {},
};

export function loadPersistedState(): PersistedState {
  if (typeof window === "undefined") {
    return emptyPersistedState;
  }

  return tryParseJson<PersistedState>(
    window.localStorage.getItem(STORAGE_KEY) ?? "",
    emptyPersistedState,
  );
}

export function savePersistedState(state: PersistedState) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function mergeProfiles(
  persistedProfiles: ConnectionProfile[],
  defaultProfiles: ConnectionProfile[],
) {
  const normalizeProfile = (profile: ConnectionProfile) => ({
    ...profile,
    baseUrl: normalizeBaseUrl(profile.baseUrl),
  });

  const canonicalProfiles = new Map(
    defaultProfiles.map((profile) => {
      const normalizedProfile = normalizeProfile(profile);
      return [normalizedProfile.id || `${normalizedProfile.label}:${normalizedProfile.baseUrl}`, normalizedProfile];
    }),
  );

  const localOnlyProfiles: ConnectionProfile[] = [];

  for (const persistedProfile of persistedProfiles.map(normalizeProfile)) {
    const profileKey = persistedProfile.id || `${persistedProfile.label}:${persistedProfile.baseUrl}`;
    const canonicalProfile = canonicalProfiles.get(profileKey);

    if (!canonicalProfile) {
      localOnlyProfiles.push(persistedProfile);
      continue;
    }

    canonicalProfiles.set(profileKey, {
      ...persistedProfile,
      ...canonicalProfile,
      lastCheckedAt: persistedProfile.lastCheckedAt,
      lastConnectionStatus:
        persistedProfile.lastConnectionStatus ?? canonicalProfile.lastConnectionStatus,
      lastConnectionError: persistedProfile.lastConnectionError,
      lastSuccessfulSyncAt:
        persistedProfile.lastSuccessfulSyncAt ?? canonicalProfile.lastSuccessfulSyncAt,
    });
  }

  return dedupeBy([...canonicalProfiles.values(), ...localOnlyProfiles], (profile) =>
    profile.id || `${profile.label}:${profile.baseUrl}`,
  );
}
