import type { ConnectionProfile, RuntimeConfig, TransportMode } from "@/lib/types";
import { normalizeBaseUrl, splitCsv, tryParseJson } from "@/lib/utils";
import { resolve } from "node:path";

function parseBoolean(value: string | undefined, fallback: boolean) {
  if (value === undefined) {
    return fallback;
  }
  return value === "true" || value === "1";
}

function parseNumber(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseProfiles(value: string | undefined): ConnectionProfile[] {
  const rawProfiles = tryParseJson<ConnectionProfile[]>(value ?? "", []);
  return rawProfiles.map((profile) => ({
    ...profile,
    baseUrl: normalizeBaseUrl(profile.baseUrl),
  }));
}

export function getRuntimeConfig(): RuntimeConfig {
  const defaultTransport = (process.env.DEFAULT_TRANSPORT as TransportMode | undefined) ?? "direct";
  const proxyBasePath = process.env.PROXY_BASE_PATH || "/proxy";
  const proxyEnabled = parseBoolean(process.env.PROXY_ENABLED, false);
  return {
    branding: {
      name: process.env.APP_BRANDING_NAME || "Signal Rest UI",
      tagline:
        process.env.APP_BRANDING_TAGLINE ||
        "Modern control surface for signal-cli-rest-api",
    },
    defaultProfiles: parseProfiles(process.env.DEFAULT_PROFILES_JSON),
    defaultTransport,
    proxy: {
      enabled: proxyEnabled,
      basePath: proxyBasePath,
      allowedHosts: splitCsv(process.env.PROXY_ALLOWED_HOSTS || ""),
    },
    refreshIntervalMs: parseNumber(process.env.REFRESH_INTERVAL_MS, 15_000),
  };
}

export function getServerPort() {
  return parseNumber(process.env.PORT, 3000);
}

export function getProfilesFilePath() {
  return resolve(process.cwd(), process.env.PROFILES_FILE_PATH || "data/connection-targets.yaml");
}
