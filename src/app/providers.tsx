import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useMemo } from "react";
import React from "react";
import { RouterProvider } from "react-router-dom";
import { AppStateProvider } from "@/app/app-state";
import { loadRuntimeConfig } from "@/lib/runtime-config";

type AppRouter = React.ComponentProps<typeof RouterProvider>["router"];

function RuntimeGate({ router }: { router: AppRouter }) {
  const runtimeConfig = useRuntimeConfig();
  const queryClient = useMemo(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            staleTime: 5_000,
          },
        },
      }),
    [],
  );

  if (!runtimeConfig) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8 text-stone-200">
        <div className="glass-panel w-full max-w-lg rounded-[2rem] p-10">
          <p className="font-mono text-sm uppercase tracking-[0.28em] text-emerald-300/80">
            Bootstrapping
          </p>
          <h1 className="mt-3 text-3xl font-semibold">Loading runtime config…</h1>
          <p className="mt-3 text-sm text-stone-400">
            Fetching container defaults and proxy policy before rendering the app.
          </p>
        </div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AppStateProvider runtimeConfig={runtimeConfig}>
        <RouterProvider router={router} />
      </AppStateProvider>
    </QueryClientProvider>
  );
}

function useRuntimeConfig() {
  const [runtimeConfig, setRuntimeConfig] = React.useState<Awaited<ReturnType<typeof loadRuntimeConfig>> | null>(null);

  React.useEffect(() => {
    let alive = true;
    void loadRuntimeConfig().then((config) => {
      if (alive) {
        setRuntimeConfig(config);
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  return runtimeConfig;
}

export function AppProviders({ router }: { router: AppRouter }) {
  return <RuntimeGate router={router} />;
}
