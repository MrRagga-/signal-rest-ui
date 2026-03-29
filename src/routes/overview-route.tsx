import { Activity, ArrowRight, FolderKanban, MessageSquare, Paperclip, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { useAppState } from "@/app/app-state";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { JsonView } from "@/components/ui/json-view";
import { useGetV1Health } from "@/lib/api/generated/signal";
import { endpointCatalog } from "@/lib/api/swagger";
import { useAboutQuery, useAccountsQuery, useAttachmentsQuery, useConfigurationQuery, useContactsQuery, useGroupsQuery } from "@/lib/api/signal-hooks";
import { formatTimestamp } from "@/lib/utils";
import { RequireActiveProfile } from "@/routes/route-helpers";

const summaryCards = [
  { key: "accounts", label: "Accounts", icon: Activity, to: "/accounts" },
  { key: "contacts", label: "Contacts", icon: Users, to: "/contacts" },
  { key: "groups", label: "Groups", icon: FolderKanban, to: "/groups" },
  { key: "attachments", label: "Attachments", icon: Paperclip, to: "/attachments" },
];

export function OverviewRoute() {
  const { activeProfile, activeAccountNumber } = useAppState();
  const aboutQuery = useAboutQuery();
  const healthQuery = useGetV1Health({
    query: {
      enabled: Boolean(activeProfile),
    },
  });
  const configurationQuery = useConfigurationQuery();
  const accountsQuery = useAccountsQuery();
  const contactsQuery = useContactsQuery();
  const groupsQuery = useGroupsQuery();
  const attachmentsQuery = useAttachmentsQuery();

  const stats = {
    accounts: accountsQuery.data?.length ?? 0,
    contacts: contactsQuery.data?.length ?? 0,
    groups: groupsQuery.data?.length ?? 0,
    attachments: attachmentsQuery.data?.length ?? 0,
  };

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden rounded-[2.2rem] p-0">
        <div className="grid gap-6 bg-[radial-gradient(circle_at_top_right,rgba(72,213,151,0.12),transparent_32%),linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0.0))] p-7 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-emerald-200/70">
              Messaging-first workspace
            </p>
            <h2 className="mt-3 max-w-3xl text-4xl font-semibold leading-tight">
              Run account onboarding, delivery, and API operations from one LAN-safe control surface.
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-stone-300">
              The workspace now exposes the full Signal REST surface through dedicated operator panels,
              with the API console reserved for raw payload tweaking and diagnostics.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Badge>{activeProfile?.label ?? "No active profile"}</Badge>
              {activeAccountNumber ? (
                <Badge className="border-white/10 bg-white/[0.06] text-stone-100">
                  account {activeAccountNumber}
                </Badge>
              ) : null}
              <Badge className="border-white/10 bg-white/[0.06] text-stone-100">
                {activeProfile?.transport ?? "direct"}
              </Badge>
            </div>
          </div>

          <div className="rounded-[1.8rem] border border-white/8 bg-black/20 p-5">
            <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-stone-500">
              Active target
            </p>
            <div className="mt-4 space-y-3 text-sm text-stone-300">
              <div>
                <p className="text-stone-500">Base URL</p>
                <p className="mt-1 break-all font-mono text-xs text-stone-100">
                  {activeProfile?.baseUrl ?? "Not configured"}
                </p>
              </div>
              <div>
                <p className="text-stone-500">Last sync</p>
                <p className="mt-1">{formatTimestamp(activeProfile?.lastSuccessfulSyncAt)}</p>
              </div>
              <div>
                <p className="text-stone-500">Last health check</p>
                <p className="mt-1">{formatTimestamp(activeProfile?.lastCheckedAt)}</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <RequireActiveProfile>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card) => {
            const Icon = card.icon;
            return (
              <Link key={card.key} className="group block" to={card.to}>
                <Card className="h-full transition hover:border-emerald-300/25 hover:bg-white/[0.05] focus-within:border-emerald-300/25 focus-within:bg-white/[0.05]">
                  <CardHeader>
                    <div>
                      <CardDescription className="transition group-hover:text-stone-200">
                        {card.label}
                      </CardDescription>
                      <CardTitle className="mt-3 text-3xl">
                        {stats[card.key as keyof typeof stats]}
                      </CardTitle>
                      <p className="mt-4 inline-flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-stone-500 transition group-hover:text-emerald-200">
                        Open {card.label}
                        <ArrowRight className="size-3.5" />
                      </p>
                    </div>
                    <div className="rounded-full border border-white/10 bg-white/[0.04] p-3 transition group-hover:border-emerald-300/20 group-hover:bg-emerald-400/10">
                      <Icon className="size-5 text-emerald-200" />
                    </div>
                  </CardHeader>
                </Card>
              </Link>
            );
          })}
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Connection telemetry</CardTitle>
                <CardDescription>
                  Upstream about/configuration data plus the live API health probe.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 lg:grid-cols-3">
              <div>
                <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.28em] text-stone-500">
                  /v1/about
                </p>
                <JsonView value={aboutQuery.data ?? { status: "No data yet" }} />
              </div>
              <div>
                <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.28em] text-stone-500">
                  /v1/health
                </p>
                <JsonView value={healthQuery.data ?? { status: "Health check pending" }} />
              </div>
              <div>
                <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.28em] text-stone-500">
                  /v1/configuration
                </p>
                <JsonView value={configurationQuery.data ?? { status: "No data yet" }} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Receive caveat</CardTitle>
                <CardDescription>
                  Upstream warns that auto-scheduled receive can drain pending messages when used carelessly.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 text-sm leading-7 text-stone-300">
              <div className="rounded-[1.4rem] border border-amber-200/12 bg-amber-300/8 p-4 text-amber-50">
                Keep auto-receive opt-in per profile. For operators who are already
                consuming messages elsewhere, use manual sync from the Messages page instead.
              </div>
              <div className="rounded-[1.4rem] border border-white/8 bg-black/20 p-4">
                <p className="font-semibold text-stone-100">Capability coverage</p>
                <ul className="mt-3 space-y-2 text-sm text-stone-400">
                  <li>{endpointCatalog.length} documented REST operations are reachable from this UI.</li>
                  <li>Dedicated workflow screens now cover onboarding, delivery, contacts, groups, attachments, and admin settings.</li>
                  <li>The API console remains available for raw payload editing, binary preview, and endpoint diagnostics.</li>
                </ul>
              </div>
              <div className="flex items-center gap-3 rounded-[1.4rem] border border-white/8 bg-white/[0.03] p-4">
                <MessageSquare className="size-5 text-emerald-200" />
                <p className="text-sm text-stone-300">
                  Compose, sync, and inspect uncommon endpoints without leaving the app shell.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </RequireActiveProfile>
    </div>
  );
}
