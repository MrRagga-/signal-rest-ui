import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { parse, stringify } from "yaml";
import type { ConnectionProfile } from "@/lib/types";
import { normalizeBaseUrl } from "@/lib/utils";

type TransientProfileKey =
  | "lastCheckedAt"
  | "lastConnectionStatus"
  | "lastConnectionError"
  | "lastSuccessfulSyncAt";

type StoredConnectionProfile = Omit<ConnectionProfile, TransientProfileKey>;

interface StoredProfilesDocument {
  profiles?: StoredConnectionProfile[];
}

function sanitizeProfile(profile: Partial<ConnectionProfile>): StoredConnectionProfile {
  const now = new Date().toISOString();

  return {
    id: profile.id?.trim() || crypto.randomUUID(),
    label: profile.label?.trim() || "",
    baseUrl: normalizeBaseUrl(profile.baseUrl ?? ""),
    transport: profile.transport === "proxy" ? "proxy" : "direct",
    authHeaderName: profile.authHeaderName?.trim() || undefined,
    authToken: profile.authToken?.trim() || undefined,
    defaultAccountNumber: profile.defaultAccountNumber?.trim() || undefined,
    autoReceiveEnabled: Boolean(profile.autoReceiveEnabled),
    createdAt: profile.createdAt || now,
    updatedAt: profile.updatedAt || now,
  };
}

function sanitizeProfiles(profiles: Partial<ConnectionProfile>[]) {
  const dedupedProfiles = new Map<string, StoredConnectionProfile>();

  for (const profile of profiles) {
    const sanitizedProfile = sanitizeProfile(profile);
    if (!sanitizedProfile.label || !sanitizedProfile.baseUrl) {
      continue;
    }
    dedupedProfiles.set(sanitizedProfile.id, sanitizedProfile);
  }

  return [...dedupedProfiles.values()];
}

export class ProfilesStore {
  constructor(
    private readonly filePath: string,
    private readonly seedProfiles: ConnectionProfile[] = [],
  ) {}

  async list(): Promise<StoredConnectionProfile[]> {
    const storedProfiles = await this.readFromDisk();
    if (storedProfiles) {
      return storedProfiles;
    }
    return sanitizeProfiles(this.seedProfiles);
  }

  async create(profile: Partial<ConnectionProfile>) {
    const nextProfile = sanitizeProfile(profile);
    const currentProfiles = await this.list();

    if (!nextProfile.label || !nextProfile.baseUrl) {
      throw new Error("Profile label and base URL are required.");
    }

    if (currentProfiles.some((currentProfile) => currentProfile.id === nextProfile.id)) {
      throw new Error(`Profile ${nextProfile.id} already exists.`);
    }

    await this.writeToDisk([...currentProfiles, nextProfile]);
    return nextProfile;
  }

  async update(profileId: string, profile: Partial<ConnectionProfile>) {
    const currentProfiles = await this.list();
    const existingProfile = currentProfiles.find((currentProfile) => currentProfile.id === profileId);

    if (!existingProfile) {
      throw new Error(`Profile ${profileId} does not exist.`);
    }

    const nextProfile = sanitizeProfile({
      ...existingProfile,
      ...profile,
      id: profileId,
      createdAt: existingProfile.createdAt,
      updatedAt: profile.updatedAt || new Date().toISOString(),
    });

    if (!nextProfile.label || !nextProfile.baseUrl) {
      throw new Error("Profile label and base URL are required.");
    }

    await this.writeToDisk(
      currentProfiles.map((currentProfile) =>
        currentProfile.id === profileId ? nextProfile : currentProfile,
      ),
    );

    return nextProfile;
  }

  async remove(profileId: string) {
    const currentProfiles = await this.list();
    const nextProfiles = currentProfiles.filter((profile) => profile.id !== profileId);

    if (nextProfiles.length === currentProfiles.length) {
      return false;
    }

    await this.writeToDisk(nextProfiles);
    return true;
  }

  private async readFromDisk(): Promise<StoredConnectionProfile[] | null> {
    try {
      const rawDocument = await readFile(this.filePath, "utf8");
      const parsedDocument = parse(rawDocument) as StoredProfilesDocument | StoredConnectionProfile[];
      const rawProfiles = Array.isArray(parsedDocument)
        ? parsedDocument
        : parsedDocument?.profiles ?? [];

      return sanitizeProfiles(rawProfiles);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return null;
      }

      console.warn(`Unable to read connection targets from ${this.filePath}.`, error);
      return sanitizeProfiles(this.seedProfiles);
    }
  }

  private async writeToDisk(profiles: StoredConnectionProfile[]) {
    await mkdir(dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, stringify({ profiles }), "utf8");
  }
}
