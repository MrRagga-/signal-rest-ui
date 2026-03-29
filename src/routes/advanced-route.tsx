import { useAppState } from "@/app/app-state";
import { ActionFormCard } from "@/components/ui/action-form-card";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { JsonView } from "@/components/ui/json-view";
import { StatusBanner } from "@/components/ui/status-banner";
import { useGetV1ConfigurationNumberSettings, usePostV1Configuration, usePostV1ConfigurationNumberSettings } from "@/lib/api/generated/signal";
import { useConfigurationQuery } from "@/lib/api/signal-hooks";
import { RequireActiveProfile } from "@/routes/route-helpers";

export function AdvancedRoute() {
  const { activeAccountNumber } = useAppState();
  const configurationQuery = useConfigurationQuery();
  const trustModeQuery = useGetV1ConfigurationNumberSettings(activeAccountNumber ?? "", {
    query: {
      enabled: Boolean(activeAccountNumber),
    },
  });
  const updateConfigurationMutation = usePostV1Configuration();
  const updateTrustModeMutation = usePostV1ConfigurationNumberSettings();

  return (
    <RequireActiveProfile>
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Advanced administration</CardTitle>
              <CardDescription>
                Runtime API configuration and account trust-mode controls live here so they stay available without crowding the operational pages.
              </CardDescription>
            </div>
            {activeAccountNumber ? <Badge>{activeAccountNumber}</Badge> : <Badge>profile scoped</Badge>}
          </CardHeader>
          <CardContent className="space-y-4">
            <StatusBanner title="Admin-only controls" variant="warning">
              These endpoints change server/runtime behavior rather than message content. Apply changes deliberately and verify them against the live configuration panels below.
            </StatusBanner>
          </CardContent>
        </Card>

        <div className="grid gap-4 xl:grid-cols-2">
          <ActionFormCard
            badge="REST API config"
            description="Update the REST API runtime logging level through `/v1/configuration`."
            fields={[
              {
                key: "loggingLevel",
                label: "Logging level",
                kind: "select",
                options: [
                  { label: "debug", value: "debug" },
                  { label: "info", value: "info" },
                  { label: "warn", value: "warn" },
                  { label: "error", value: "error" },
                ],
              },
            ]}
            initialValues={{
              loggingLevel:
                String(
                  (configurationQuery.data as { logging?: { Level?: string } } | undefined)?.logging?.Level ?? "info",
                ),
            }}
            onSubmit={async (values) => {
              const result = await updateConfigurationMutation.mutateAsync({
                data: {
                  logging: {
                    Level: String(values.loggingLevel ?? "info"),
                  },
                },
              });
              await configurationQuery.refetch();
              return {
                result,
                feedback: {
                  variant: "success",
                  title: "Configuration updated",
                  message: "The general REST API configuration was updated.",
                },
              };
            }}
            resetKey={`configuration-${(configurationQuery.data as { logging?: { Level?: string } } | undefined)?.logging?.Level ?? "info"}`}
            submitLabel="Save runtime configuration"
            title="General configuration"
            warning="Changing log level affects the upstream service globally for the selected target."
            footer={
              <div className="min-w-full">
                <JsonView value={configurationQuery.data ?? configurationQuery.error ?? { status: "No configuration loaded yet." }} />
              </div>
            }
          />

          <ActionFormCard
            badge={activeAccountNumber ?? "Select account"}
            description="Read and update account-specific trust handling through `/v1/configuration/{number}/settings`."
            fields={[
              {
                key: "trustMode",
                label: "Trust mode",
                kind: "select",
                options: [
                  { label: "on-first-use", value: "on-first-use" },
                  { label: "always", value: "always" },
                  { label: "never", value: "never" },
                ],
              },
            ]}
            initialValues={{
              trustMode: trustModeQuery.data?.data?.trust_mode ?? "on-first-use",
            }}
            disabled={!activeAccountNumber}
            onSubmit={async (values) => {
              if (!activeAccountNumber) {
                throw new Error("Select an active account first.");
              }
              const result = await updateTrustModeMutation.mutateAsync({
                number: activeAccountNumber,
                data: {
                  trust_mode: String(values.trustMode ?? "on-first-use"),
                },
              });
              await trustModeQuery.refetch();
              return {
                result,
                feedback: {
                  variant: "success",
                  title: "Trust mode updated",
                  message: `The account trust mode for ${activeAccountNumber} was updated.`,
                },
              };
            }}
            resetKey={`trust-mode-${activeAccountNumber ?? "none"}-${trustModeQuery.data?.data?.trust_mode ?? "on-first-use"}`}
            submitLabel="Apply trust mode"
            title="Account trust mode"
            warning="Trust mode affects how newly seen identities are handled for the selected account."
            footer={
              <div className="min-w-full">
                <JsonView value={trustModeQuery.data?.data ?? trustModeQuery.error ?? { status: "Select an account to load trust mode." }} />
              </div>
            }
          />
        </div>
      </div>
    </RequireActiveProfile>
  );
}
