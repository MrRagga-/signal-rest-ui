import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import { AppStateProvider } from "@/app/app-state";
import type { ConnectionProfile, RuntimeConfig } from "@/lib/types";

interface RenderAppOptions {
  runtimeConfig?: RuntimeConfig;
  persistedState?: {
    profiles?: ConnectionProfile[];
    activeProfileId?: string;
    activeAccounts?: Record<string, string>;
  };
}

export function makeProfile(overrides: Partial<ConnectionProfile> = {}): ConnectionProfile {
  return {
    id: "default-profile",
    label: "Test Profile",
    baseUrl: "http://signal.test:8080",
    transport: "direct",
    autoReceiveEnabled: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    defaultAccountNumber: "+4911111111",
    ...overrides,
  };
}

export function makeRuntimeConfig(
  profile: ConnectionProfile = makeProfile(),
  overrides: Partial<RuntimeConfig> = {},
): RuntimeConfig {
  return {
    branding: {
      name: "Signal Rest UI",
      tagline: "Modern control surface for signal-cli-rest-api",
    },
    defaultProfiles: [profile],
    defaultTransport: "direct",
    proxy: {
      enabled: false,
      basePath: "/proxy",
      allowedHosts: [],
    },
    refreshIntervalMs: 15_000,
    ...overrides,
  };
}

export function renderWithApp(ui: ReactElement, options: RenderAppOptions = {}) {
  window.localStorage.setItem(
    "signal-rest-ui/state",
    JSON.stringify({
      profiles: options.persistedState?.profiles ?? [],
      activeProfileId: options.persistedState?.activeProfileId,
      activeAccounts: options.persistedState?.activeAccounts ?? {},
    }),
  );

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AppStateProvider
        runtimeConfig={options.runtimeConfig ?? makeRuntimeConfig()}
      >
        {ui}
      </AppStateProvider>
    </QueryClientProvider>,
  );
}
