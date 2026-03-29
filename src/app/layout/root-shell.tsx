import {
  Cable,
  FolderKanban,
  Info,
  MessageSquareDot,
  Paperclip,
  Route,
  Shield,
  Users,
  UserRoundCog,
} from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import { useAppState } from "@/app/app-state";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { cn, formatTimestamp } from "@/lib/utils";

const navigation = [
  { to: "/", label: "Overview", icon: Cable },
  { to: "/connect", label: "Connect", icon: Route },
  { to: "/accounts", label: "Accounts", icon: UserRoundCog },
  { to: "/messages", label: "Messages", icon: MessageSquareDot },
  { to: "/contacts", label: "Contacts", icon: Users },
  { to: "/groups", label: "Groups", icon: FolderKanban },
  { to: "/attachments", label: "Attachments", icon: Paperclip },
  { to: "/advanced", label: "Advanced", icon: Shield },
  { to: "/api", label: "API Console", icon: Cable },
  { to: "/about", label: "About", icon: Info },
];

export function RootShell() {
  const {
    profiles,
    activeProfile,
    activeAccountNumber,
    setActiveProfileId,
    setActiveAccount,
  } = useAppState();

  return (
    <div className="min-h-screen px-4 py-4 text-stone-100 md:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-[1600px] grid-cols-1 gap-4 lg:grid-cols-[290px_minmax(0,1fr)]">
        <aside className="glass-panel rounded-[2rem] border border-white/8 p-5 lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)]">
          <div className="rounded-[1.5rem] bg-gradient-to-br from-emerald-300/15 via-transparent to-amber-200/8 p-5">
            <img
              alt="Signal Rest UI logo"
              className="mx-auto block w-full max-w-[220px]"
              src="/signal-rest-ui-mark.svg"
            />
          </div>

          <nav className="mt-6 space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/"}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 rounded-[1.2rem] px-4 py-3 text-sm font-semibold transition",
                      isActive
                        ? "bg-emerald-400 text-emerald-950 shadow-[0_10px_30px_rgba(72,213,151,0.2)]"
                        : "text-stone-400 hover:bg-white/6 hover:text-white",
                    )
                  }
                >
                  <Icon className="size-4" />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>

          <div className="mt-6 rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-stone-500">
              Profile status
            </p>
            <div className="mt-3 flex items-center gap-2">
              <Badge
                className={cn(
                  activeProfile?.lastConnectionStatus === "error" &&
                    "border-rose-200/10 bg-rose-400/10 text-rose-200",
                )}
              >
                {activeProfile?.lastConnectionStatus ?? "idle"}
              </Badge>
              {activeProfile?.transport ? (
                <Badge className="border-white/10 bg-white/[0.06] text-stone-200">
                  {activeProfile.transport}
                </Badge>
              ) : null}
            </div>
            <p className="mt-3 text-sm text-stone-400">
              Last sync: {formatTimestamp(activeProfile?.lastSuccessfulSyncAt)}
            </p>
          </div>
        </aside>

        <main className="space-y-4">
          <Card className="rounded-[2rem] px-5 py-4">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-stone-500">
                  Live endpoint
                </p>
                <p className="mt-2 text-sm text-stone-300">
                  Select a saved LAN target and keep account scope explicit.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[560px]">
                <Select
                  aria-label="Connection profile"
                  value={activeProfile?.id ?? ""}
                  onChange={(event) => setActiveProfileId(event.target.value)}
                >
                  <option value="">No active profile</option>
                  {profiles.map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {profile.label} • {profile.baseUrl}
                    </option>
                  ))}
                </Select>

                <Select
                  aria-label="Active account"
                  value={activeAccountNumber ?? ""}
                  onChange={(event) =>
                    activeProfile
                      ? setActiveAccount(activeProfile.id, event.target.value)
                      : undefined
                  }
                >
                  <option value="">No active account</option>
                  {activeProfile?.defaultAccountNumber ? (
                    <option value={activeProfile.defaultAccountNumber}>
                      {activeProfile.defaultAccountNumber}
                    </option>
                  ) : null}
                  {activeAccountNumber &&
                  activeAccountNumber !==
                    activeProfile?.defaultAccountNumber ? (
                    <option value={activeAccountNumber}>
                      {activeAccountNumber}
                    </option>
                  ) : null}
                </Select>
              </div>
            </div>
          </Card>

          <Outlet />
        </main>
      </div>
    </div>
  );
}
