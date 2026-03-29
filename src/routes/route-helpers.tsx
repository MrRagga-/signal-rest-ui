import type { ReactNode } from "react";
import { useAppState } from "@/app/app-state";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export function RequireActiveProfile({ children }: { children: ReactNode }) {
  const { activeProfile } = useAppState();

  if (!activeProfile) {
    return (
      <EmptyState
        title="No connection profile selected"
        description="Create or activate a LAN target on the Connect page before using the rest of the workspace."
        action={
          <Button asChild>
            <a href="/connect">Open connection setup</a>
          </Button>
        }
      />
    );
  }

  return <>{children}</>;
}

export function RequireActiveAccount({ children }: { children: ReactNode }) {
  const { activeAccountNumber } = useAppState();

  return (
    <RequireActiveProfile>
      {activeAccountNumber ? (
        children
      ) : (
        <EmptyState
          title="No active account selected"
          description="Choose the Signal account that should own contacts and groups before using these account-scoped tools."
          action={
            <Button asChild>
              <a href="/accounts">Open accounts</a>
            </Button>
          }
        />
      )}
    </RequireActiveProfile>
  );
}
