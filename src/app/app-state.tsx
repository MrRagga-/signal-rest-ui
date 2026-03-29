import {
  createContext,
  startTransition,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import { setApiRuntimeState } from "@/lib/api/runtime";
import {
  emptyPersistedState,
  loadPersistedState,
  mergeProfiles,
  savePersistedState,
} from "@/lib/storage";
import type { ConnectionProfile, RuntimeConfig } from "@/lib/types";

interface AppStateContextValue {
  runtimeConfig: RuntimeConfig;
  profiles: ConnectionProfile[];
  activeProfile?: ConnectionProfile;
  activeProfileId?: string;
  activeAccountNumber?: string;
  activeAccounts: Record<string, string>;
  setActiveProfileId: (profileId: string) => void;
  upsertProfile: (profile: ConnectionProfile, options?: { activate?: boolean }) => void;
  deleteProfile: (profileId: string) => void;
  setActiveAccount: (profileId: string, accountNumber: string) => void;
  setProfileConnectionState: (
    profileId: string,
    status: ConnectionProfile["lastConnectionStatus"],
    error?: string,
  ) => void;
  markProfileSynced: (profileId: string) => void;
}

const AppStateContext = createContext<AppStateContextValue | null>(null);

export function AppStateProvider({
  children,
  runtimeConfig,
}: PropsWithChildren<{ runtimeConfig: RuntimeConfig }>) {
  const persistedState =
    typeof window === "undefined" ? emptyPersistedState : loadPersistedState();

  const [profiles, setProfiles] = useState<ConnectionProfile[]>(() =>
    mergeProfiles(persistedState.profiles, runtimeConfig.defaultProfiles),
  );
  const [activeProfileId, setActiveProfileIdState] = useState<string | undefined>(
    persistedState.activeProfileId || runtimeConfig.defaultProfiles[0]?.id,
  );
  const [activeAccounts, setActiveAccounts] = useState<Record<string, string>>(
    persistedState.activeAccounts ?? {},
  );

  const activeProfile = useMemo(
    () => profiles.find((profile) => profile.id === activeProfileId) ?? profiles[0],
    [profiles, activeProfileId],
  );
  const activeAccountNumber = activeProfile
    ? activeAccounts[activeProfile.id] || activeProfile.defaultAccountNumber
    : undefined;

  useEffect(() => {
    if (!activeProfile && profiles[0]) {
      setActiveProfileIdState(profiles[0].id);
    }
  }, [activeProfile, profiles]);

  useEffect(() => {
    if (!runtimeConfig.defaultProfiles.length) {
      return;
    }

    startTransition(() => {
      setProfiles((currentProfiles) =>
        mergeProfiles(currentProfiles, runtimeConfig.defaultProfiles),
      );
      setActiveProfileIdState((currentActiveProfileId) =>
        currentActiveProfileId || runtimeConfig.defaultProfiles[0]?.id,
      );
    });
  }, [runtimeConfig.defaultProfiles]);

  useEffect(() => {
    savePersistedState({
      profiles,
      activeProfileId: activeProfile?.id,
      activeAccounts,
    });
  }, [profiles, activeProfile, activeAccounts]);

  useEffect(() => {
    setApiRuntimeState({
      profile: activeProfile,
      runtimeConfig,
    });
  }, [activeProfile, runtimeConfig]);

  const value = useMemo<AppStateContextValue>(
    () => ({
      runtimeConfig,
      profiles,
      activeProfile,
      activeProfileId: activeProfile?.id,
      activeAccountNumber,
      activeAccounts,
      setActiveProfileId: (profileId) => {
        startTransition(() => {
          setActiveProfileIdState(profileId);
        });
      },
      upsertProfile: (profile, options) => {
        setProfiles((currentProfiles) => {
          const existing = currentProfiles.findIndex(
            (currentProfile) => currentProfile.id === profile.id,
          );
          if (existing === -1) {
            return [...currentProfiles, profile];
          }
          const nextProfiles = [...currentProfiles];
          nextProfiles[existing] = profile;
          return nextProfiles;
        });
        if (options?.activate ?? true) {
          setActiveProfileIdState(profile.id);
        }
      },
      deleteProfile: (profileId) => {
        setProfiles((currentProfiles) =>
          currentProfiles.filter((profile) => profile.id !== profileId),
        );
        setActiveAccounts((current) => {
          const next = { ...current };
          delete next[profileId];
          return next;
        });
        if (activeProfileId === profileId) {
          setActiveProfileIdState(undefined);
        }
      },
      setActiveAccount: (profileId, accountNumber) => {
        setActiveAccounts((current) => ({
          ...current,
          [profileId]: accountNumber,
        }));
      },
      setProfileConnectionState: (profileId, status, error) => {
        setProfiles((currentProfiles) =>
          currentProfiles.map((profile) =>
            profile.id === profileId
              ? {
                  ...profile,
                  lastConnectionStatus: status,
                  lastConnectionError: error,
                  lastCheckedAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                }
              : profile,
          ),
        );
      },
      markProfileSynced: (profileId) => {
        setProfiles((currentProfiles) =>
          currentProfiles.map((profile) =>
            profile.id === profileId
              ? {
                  ...profile,
                  lastSuccessfulSyncAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                }
              : profile,
          ),
        );
      },
    }),
    [activeAccountNumber, activeAccounts, activeProfile, activeProfileId, profiles, runtimeConfig],
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const value = useContext(AppStateContext);
  if (!value) {
    throw new Error("useAppState must be used within AppStateProvider");
  }
  return value;
}
