import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, RefreshCcw, Trash2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useAppState } from "@/app/app-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useConnectionTestMutation } from "@/lib/api/signal-hooks";
import {
  createConnectionTarget,
  deleteConnectionTarget,
  updateConnectionTarget,
} from "@/lib/api/targets-client";
import type { ConnectionProfile } from "@/lib/types";
import { normalizeBaseUrl, slugify } from "@/lib/utils";

const connectionSchema = z.object({
  label: z.string().min(2, "Label is required"),
  baseUrl: z.string().min(3, "Base URL is required"),
  transport: z.enum(["direct", "proxy"]),
  authHeaderName: z.string().optional(),
  authToken: z.string().optional(),
  autoReceiveEnabled: z.boolean(),
});

type ConnectionFormValues = z.infer<typeof connectionSchema>;

export function ConnectRoute() {
  const {
    runtimeConfig,
    profiles,
    setActiveProfileId,
    upsertProfile,
    deleteProfile,
    setProfileConnectionState,
  } = useAppState();
  const testMutation = useConnectionTestMutation();
  const [connectionNotice, setConnectionNotice] = useState<string | null>(null);
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [busyProfileId, setBusyProfileId] = useState<string | null>(null);
  const editingProfile = profiles.find((profile) => profile.id === editingProfileId);

  const getEmptyFormValues = (transport = runtimeConfig.defaultTransport): ConnectionFormValues => ({
    label: "",
    baseUrl: "",
    transport,
    authHeaderName: "Authorization",
    authToken: "",
    autoReceiveEnabled: false,
  });

  const form = useForm<ConnectionFormValues>({
    resolver: zodResolver(connectionSchema),
    defaultValues: getEmptyFormValues(),
  });

  const buildProfileDraft = (values: ConnectionFormValues) => {
    const now = new Date().toISOString();
    const baseProfile = editingProfile;
    return {
      now,
      baseProfile,
      profile: {
        ...baseProfile,
        id: baseProfile?.id ?? (slugify(values.label) || crypto.randomUUID()),
        label: values.label,
        baseUrl: normalizeBaseUrl(values.baseUrl),
        transport: values.transport,
        authHeaderName: values.authHeaderName || undefined,
        authToken: values.authToken || undefined,
        autoReceiveEnabled: values.autoReceiveEnabled,
        createdAt: baseProfile?.createdAt ?? now,
        updatedAt: now,
        lastConnectionStatus: baseProfile?.lastConnectionStatus ?? "idle",
      } satisfies ConnectionProfile,
    };
  };

  const persistProfile = async (
    profile: ConnectionProfile,
    options?: {
      notice?: string | null;
      lastConnectionStatus?: ConnectionProfile["lastConnectionStatus"];
      lastConnectionError?: string;
      lastCheckedAt?: string;
    },
  ) => {
    const savedProfile = editingProfile
      ? await updateConnectionTarget(editingProfile.id, {
          ...editingProfile,
          ...profile,
          id: editingProfile.id,
          createdAt: editingProfile.createdAt,
          updatedAt: profile.updatedAt,
        })
      : await createConnectionTarget(profile);

    upsertProfile({
      ...editingProfile,
      ...savedProfile,
      lastConnectionStatus:
        options?.lastConnectionStatus ?? profile.lastConnectionStatus ?? "idle",
      lastConnectionError: options?.lastConnectionError,
      lastCheckedAt: options?.lastCheckedAt,
      lastSuccessfulSyncAt: editingProfile?.lastSuccessfulSyncAt,
    });

    setConnectionNotice(options?.notice ?? null);
    resetWizard(savedProfile.transport, {
      clearNotice: false,
    });
  };

  const resetWizard = (
    transport = runtimeConfig.defaultTransport,
    options?: { clearNotice?: boolean },
  ) => {
    setEditingProfileId(null);
    if (options?.clearNotice ?? true) {
      setConnectionNotice(null);
    }
    form.clearErrors();
    form.reset(getEmptyFormValues(transport));
  };

  const loadProfileIntoForm = (profile: ConnectionProfile) => {
    setEditingProfileId(profile.id);
    setConnectionNotice(null);
    form.clearErrors();
    form.reset({
      label: profile.label,
      baseUrl: profile.baseUrl,
      transport: profile.transport,
      authHeaderName: profile.authHeaderName ?? "Authorization",
      authToken: profile.authToken ?? "",
      autoReceiveEnabled: profile.autoReceiveEnabled,
    });
  };

  const onSubmit = form.handleSubmit(async (values) => {
    setConnectionNotice(null);
    const { now, baseProfile, profile } = buildProfileDraft(values);

    try {
      const result = await testMutation.mutateAsync(profile);
      const testedProfile = result.profile;
      await persistProfile(
        {
          ...profile,
          ...testedProfile,
          id: profile.id,
          createdAt: baseProfile?.createdAt ?? testedProfile.createdAt,
          updatedAt: now,
        },
        {
          notice: result.warning ?? null,
          lastConnectionStatus: "ok",
          lastConnectionError: undefined,
          lastCheckedAt: now,
        },
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Connection test failed";

      try {
        await persistProfile(
          {
            ...profile,
            lastConnectionStatus: "error",
            lastConnectionError: errorMessage,
          },
          {
            notice: `Target saved, but connectivity test failed. ${errorMessage}`,
            lastConnectionStatus: "error",
            lastConnectionError: errorMessage,
            lastCheckedAt: now,
          },
        );
      } catch {
        setConnectionNotice(errorMessage);
        setProfileConnectionState(profile.id, "error", errorMessage);
        form.setError("baseUrl", {
          message: errorMessage,
        });
      }
    }
  });

  const onSaveWithoutTesting = async () => {
    const isValid = await form.trigger();
    if (!isValid) {
      return;
    }

    setConnectionNotice(null);
    const { profile } = buildProfileDraft(form.getValues());

    try {
      await persistProfile(profile, {
        notice: editingProfile
          ? "Changes saved without connectivity verification."
          : "Target saved without connectivity verification.",
        lastConnectionStatus: editingProfile?.lastConnectionStatus ?? "idle",
        lastConnectionError: editingProfile?.lastConnectionError,
        lastCheckedAt: editingProfile?.lastCheckedAt,
      });
    } catch (error) {
      setConnectionNotice(
        error instanceof Error ? error.message : "Unable to save target.",
      );
    }
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Connection wizard</CardTitle>
            <CardDescription>
              Add a LAN target, test `/v1/about`, and persist transport/auth defaults in the server-backed targets file.
            </CardDescription>
          </div>
          {runtimeConfig.proxy.enabled ? <Badge>proxy available</Badge> : <Badge>direct-first</Badge>}
        </CardHeader>
        <CardContent>
          <form className="grid gap-5 md:grid-cols-2" onSubmit={onSubmit}>
            {editingProfile ? (
              <div className="md:col-span-2 rounded-[1.2rem] border border-sky-200/10 bg-sky-400/10 px-4 py-3 text-sm text-sky-100">
                Editing <strong>{editingProfile.label}</strong>. Saving changes keeps the existing
                profile identity so linked account selection stays intact.
              </div>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="label">Profile label</Label>
              <Input id="label" placeholder="Home Signal Node" {...form.register("label")} />
              <FormError message={form.formState.errors.label?.message} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="baseUrl">Base URL</Label>
              <Input
                id="baseUrl"
                placeholder="http://192.168.1.20:8080"
                {...form.register("baseUrl")}
              />
              <FormError message={form.formState.errors.baseUrl?.message} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="transport">Transport mode</Label>
              <Select id="transport" {...form.register("transport")}>
                <option value="direct">Direct browser access</option>
                <option value="proxy" disabled={!runtimeConfig.proxy.enabled}>
                  Same-container proxy
                </option>
              </Select>
              <p className="text-xs text-stone-500">
                Direct mode uses the browser. Proxy mode routes through this container when CORS or LAN visibility gets in the way.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="authHeaderName">Optional auth header</Label>
              <Input id="authHeaderName" placeholder="Authorization" {...form.register("authHeaderName")} />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="authToken">Optional auth token/value</Label>
              <Input id="authToken" placeholder="Bearer xxxxx" {...form.register("authToken")} />
            </div>

            <div className="md:col-span-2 flex items-center justify-between rounded-[1.4rem] border border-amber-200/10 bg-amber-300/8 p-4">
              <div>
                <p className="font-semibold">Auto-receive preference</p>
                <p className="mt-1 text-sm text-stone-400">
                  Keep this off by default. Upstream warns that scheduled receive can consume pending messages unexpectedly.
                </p>
              </div>
              <Switch
                checked={form.watch("autoReceiveEnabled")}
                onCheckedChange={(checked) => form.setValue("autoReceiveEnabled", checked)}
              />
            </div>

            <div className="md:col-span-2 flex items-center justify-between gap-3">
              <p className="text-sm text-stone-400">
                Connectivity testing is recommended, but you can still save an unverified target when the host is offline or blocked by routing.
              </p>
              <div className="flex items-center gap-3">
                {editingProfile ? (
                  <Button
                    disabled={form.formState.isSubmitting || testMutation.isPending}
                    onClick={() => resetWizard(form.getValues("transport"))}
                    type="button"
                    variant="ghost"
                  >
                    Cancel
                  </Button>
                ) : null}
                <Button
                  disabled={form.formState.isSubmitting || testMutation.isPending}
                  onClick={onSaveWithoutTesting}
                  type="button"
                  variant="secondary"
                >
                  {editingProfile ? "Save without testing" : "Save unverified"}
                </Button>
                <Button disabled={form.formState.isSubmitting || testMutation.isPending} type="submit">
                  {testMutation.isPending
                    ? "Testing…"
                    : editingProfile
                      ? "Test and save changes"
                      : "Test and save profile"}
                </Button>
              </div>
            </div>

            {connectionNotice ? (
              <div className="md:col-span-2 rounded-[1.2rem] border border-emerald-200/10 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
                {connectionNotice}
              </div>
            ) : null}
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Saved targets</CardTitle>
            <CardDescription>
              Switch endpoints quickly and retest or remove old LAN nodes.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {profiles.length === 0 ? (
            <div className="rounded-[1.5rem] border border-dashed border-white/12 bg-white/[0.03] p-5 text-sm text-stone-400">
              No saved targets yet. Create the first one from the wizard.
            </div>
          ) : null}

          {profiles.map((profile) => (
            <div
              key={profile.id}
              className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{profile.label}</h3>
                    <Badge
                      className={
                        profile.lastConnectionStatus === "error"
                          ? "border-rose-200/10 bg-rose-400/10 text-rose-200"
                          : ""
                      }
                    >
                      {profile.lastConnectionStatus ?? "idle"}
                    </Badge>
                  </div>
                  <p className="mt-2 break-all font-mono text-xs text-stone-500">
                    {profile.baseUrl}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="secondary" onClick={() => setActiveProfileId(profile.id)}>
                    Activate
                  </Button>
                  <Button
                    aria-label={`Edit ${profile.label}`}
                    disabled={busyProfileId === profile.id}
                    size="sm"
                    variant="ghost"
                    onClick={() => loadProfileIntoForm(profile)}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    aria-label={`Retest ${profile.label}`}
                    disabled={busyProfileId === profile.id}
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      setBusyProfileId(profile.id);
                      try {
                        const result = await testMutation.mutateAsync(profile);
                        const now = new Date().toISOString();
                        const savedProfile = await updateConnectionTarget(profile.id, {
                          ...profile,
                          ...result.profile,
                          id: profile.id,
                          createdAt: profile.createdAt,
                          updatedAt: now,
                        });
                        if (result.warning) {
                          setConnectionNotice(`${profile.label}: ${result.warning}`);
                        } else {
                          setConnectionNotice(null);
                        }
                        upsertProfile(
                          {
                            ...profile,
                            ...savedProfile,
                            lastConnectionStatus: "ok",
                            lastCheckedAt: now,
                            lastConnectionError: undefined,
                            updatedAt: now,
                          },
                          { activate: false },
                        );
                      } catch (error) {
                        setConnectionNotice(null);
                        setProfileConnectionState(
                          profile.id,
                          "error",
                          error instanceof Error ? error.message : "Connection test failed",
                        );
                      } finally {
                        setBusyProfileId(null);
                      }
                    }}
                  >
                    <RefreshCcw className="size-4" />
                  </Button>
                  <Button
                    aria-label={`Delete ${profile.label}`}
                    disabled={busyProfileId === profile.id}
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      setBusyProfileId(profile.id);
                      try {
                        await deleteConnectionTarget(profile.id);
                        if (editingProfileId === profile.id) {
                          resetWizard(form.getValues("transport"));
                        }
                        deleteProfile(profile.id);
                        if (connectionNotice?.startsWith(`${profile.label}:`)) {
                          setConnectionNotice(null);
                        }
                      } catch (error) {
                        setConnectionNotice(
                          error instanceof Error
                            ? error.message
                            : `Unable to delete ${profile.label}.`,
                        );
                      } finally {
                        setBusyProfileId(null);
                      }
                    }}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
              <div className="mt-4 grid gap-2 text-sm text-stone-400 sm:grid-cols-3">
                <span>Transport: {profile.transport}</span>
                <span>Auth: {profile.authToken ? "configured" : "none"}</span>
                <span>Auto receive: {profile.autoReceiveEnabled ? "on" : "off"}</span>
              </div>
              {profile.lastConnectionError ? (
                <p className="mt-3 text-sm text-rose-300">{profile.lastConnectionError}</p>
              ) : null}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function FormError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }
  return <p className="text-sm text-rose-300">{message}</p>;
}
