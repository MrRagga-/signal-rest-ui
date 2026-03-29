import type { RuntimeConfig } from "@/lib/types";

const fallbackConfig: RuntimeConfig = {
  branding: {
    name: "Signal Rest UI",
    tagline: "Modern control surface for signal-cli-rest-api",
  },
  defaultProfiles: [],
  defaultTransport: "direct",
  proxy: {
    enabled: false,
    basePath: "/proxy",
    allowedHosts: [],
  },
  refreshIntervalMs: 15_000,
};

export async function loadRuntimeConfig(): Promise<RuntimeConfig> {
  try {
    const response = await fetch("/config.json");
    if (!response.ok) {
      return fallbackConfig;
    }
    const payload = (await response.json()) as Partial<RuntimeConfig>;
    return {
      ...fallbackConfig,
      ...payload,
      branding: {
        ...fallbackConfig.branding,
        ...payload.branding,
      },
      proxy: {
        ...fallbackConfig.proxy,
        ...payload.proxy,
      },
      defaultProfiles: payload.defaultProfiles ?? fallbackConfig.defaultProfiles,
    };
  } catch {
    return fallbackConfig;
  }
}
