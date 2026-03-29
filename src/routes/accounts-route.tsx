import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAppState } from "@/app/app-state";
import { useDeleteV1AccountsNumberPin, useDeleteV1AccountsNumberUsername, useDeleteV1DevicesNumberDeviceId, useDeleteV1DevicesNumberLocalData, usePostV1AccountsNumberPin, usePostV1AccountsNumberRateLimitChallenge, usePostV1AccountsNumberUsername, usePostV1DevicesNumber, usePostV1UnregisterNumber, usePutV1AccountsNumberSettings } from "@/lib/api/generated/signal";
import { ActionFormCard } from "@/components/ui/action-form-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { JsonView } from "@/components/ui/json-view";
import { Label } from "@/components/ui/label";
import { StatusBanner } from "@/components/ui/status-banner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { buildQrImageUrl, useAccountsQuery, useDevicesQuery, useRawQrLinkMutation, useRegisterNumberMutation, useVerifyNumberMutation } from "@/lib/api/signal-hooks";
import { RequireActiveProfile } from "@/routes/route-helpers";

export function AccountsRoute() {
  const { activeProfile, activeAccountNumber, setActiveAccount } = useAppState();
  const queryClient = useQueryClient();
  const accountsQuery = useAccountsQuery();
  const devicesQuery = useDevicesQuery();
  const registerMutation = useRegisterNumberMutation();
  const verifyMutation = useVerifyNumberMutation();
  const qrMutation = useRawQrLinkMutation();
  const setPinMutation = usePostV1AccountsNumberPin();
  const removePinMutation = useDeleteV1AccountsNumberPin();
  const rateLimitMutation = usePostV1AccountsNumberRateLimitChallenge();
  const updateAccountSettingsMutation = usePutV1AccountsNumberSettings();
  const setUsernameMutation = usePostV1AccountsNumberUsername();
  const removeUsernameMutation = useDeleteV1AccountsNumberUsername();
  const addDeviceMutation = usePostV1DevicesNumber();
  const removeDeviceMutation = useDeleteV1DevicesNumberDeviceId();
  const deleteLocalDataMutation = useDeleteV1DevicesNumberLocalData();
  const unregisterMutation = usePostV1UnregisterNumber();

  const [registerNumber, setRegisterNumber] = useState("");
  const [registerCaptcha, setRegisterCaptcha] = useState("");
  const [registerVoice, setRegisterVoice] = useState(false);
  const [verifyNumber, setVerifyNumber] = useState("");
  const [verifyToken, setVerifyToken] = useState("");
  const [verifyPin, setVerifyPin] = useState("");
  const [deviceName, setDeviceName] = useState("signal-rest-ui");

  const qrImageUrl = buildQrImageUrl(activeProfile, deviceName);
  const linkedDevices = useMemo(() => devicesQuery.data ?? [], [devicesQuery.data]);

  const refreshAccountState = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["accounts"] }),
      queryClient.invalidateQueries({ queryKey: ["devices"] }),
    ]);
  };

  return (
    <RequireActiveProfile>
      <div className="space-y-4">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Linked and registered accounts</CardTitle>
                <CardDescription>
                  Keep account selection explicit before sending messages or syncing.
                </CardDescription>
              </div>
              <Badge>{accountsQuery.data?.length ?? 0} accounts</Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              {accountsQuery.data?.length ? (
                accountsQuery.data.map((account) => (
                  <div
                    key={account}
                    className="flex items-center justify-between rounded-[1.4rem] border border-white/8 bg-white/[0.03] p-4"
                  >
                    <div>
                      <p className="font-semibold">{account}</p>
                      <p className="mt-1 text-sm text-stone-400">
                        {activeAccountNumber === account ? "Active account" : "Available"}
                      </p>
                    </div>
                    <Button
                      variant={activeAccountNumber === account ? "primary" : "secondary"}
                      onClick={() => activeProfile && setActiveAccount(activeProfile.id, account)}
                    >
                      {activeAccountNumber === account ? "Selected" : "Use account"}
                    </Button>
                  </div>
                ))
              ) : (
                <EmptyState
                  title="No accounts discovered yet"
                  description="Register a primary number or link a device from the onboarding tabs."
                />
              )}

              <div className="rounded-[1.4rem] border border-white/8 bg-black/20 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">Linked devices</p>
                    <p className="mt-2 text-sm text-stone-400">
                      Device inventory for the currently selected account.
                    </p>
                  </div>
                  {activeAccountNumber ? <Badge>{activeAccountNumber}</Badge> : null}
                </div>
                {linkedDevices.length ? (
                  <div className="mt-4 grid gap-3">
                    {linkedDevices.map((device) => (
                      <div
                        key={device.id ?? device.name}
                        className="rounded-[1.2rem] border border-white/8 bg-white/[0.03] p-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="font-semibold text-stone-100">
                              {device.name || `Device ${device.id}`}
                            </p>
                            <p className="mt-1 text-sm text-stone-400">
                              id {device.id ?? "unknown"} • last seen{" "}
                              {device.last_seen_timestamp ? new Date(device.last_seen_timestamp).toLocaleString() : "unknown"}
                            </p>
                          </div>
                          <Badge>{device.creation_timestamp ? "linked" : "device"}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-3">
                    <JsonView value={devicesQuery.data ?? { status: "Select an account to view devices." }} />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Onboarding flows</CardTitle>
                <CardDescription>
                  Primary-number registration, verification, and QR-based device linking.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="link">
                <TabsList>
                  <TabsTrigger value="link">Link device</TabsTrigger>
                  <TabsTrigger value="register">Register</TabsTrigger>
                  <TabsTrigger value="verify">Verify</TabsTrigger>
                </TabsList>

                <TabsContent value="link">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="deviceName">Device name</Label>
                      <Input id="deviceName" value={deviceName} onChange={(event) => setDeviceName(event.target.value)} />
                    </div>
                    <Button onClick={() => qrMutation.mutate({ deviceName })}>
                      Generate raw device URI
                    </Button>
                    {qrImageUrl ? (
                      <div className="rounded-[1.5rem] border border-white/8 bg-white p-5">
                        <img alt="Signal QR code" className="mx-auto max-h-72 rounded-xl" src={qrImageUrl} />
                      </div>
                    ) : (
                      <p className="text-sm text-stone-400">
                        QR image preview is available for direct transport without auth headers. The raw device link URI still works in all modes.
                      </p>
                    )}
                    {qrMutation.data ? <JsonView value={qrMutation.data} /> : null}
                  </div>
                </TabsContent>

                <TabsContent value="register">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="registerNumber">Phone number</Label>
                      <Input id="registerNumber" value={registerNumber} onChange={(event) => setRegisterNumber(event.target.value)} placeholder="+49123456789" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="registerCaptcha">Optional captcha token</Label>
                      <Input id="registerCaptcha" value={registerCaptcha} onChange={(event) => setRegisterCaptcha(event.target.value)} placeholder="signalcaptcha://..." />
                    </div>
                    <label className="flex items-center gap-3 rounded-[1.2rem] border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-stone-300">
                      <input checked={registerVoice} onChange={(event) => setRegisterVoice(event.target.checked)} type="checkbox" />
                      Request voice verification instead of SMS
                    </label>
                    <Button
                      disabled={registerMutation.isPending}
                      onClick={() =>
                        registerMutation.mutate({
                          number: registerNumber,
                          captcha: registerCaptcha || undefined,
                          useVoice: registerVoice,
                        })
                      }
                    >
                      {registerMutation.isPending ? "Registering…" : "Register number"}
                    </Button>
                    {registerMutation.isSuccess ? <Badge>Registration request accepted</Badge> : null}
                  </div>
                </TabsContent>

                <TabsContent value="verify">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="verifyNumber">Phone number</Label>
                      <Input id="verifyNumber" value={verifyNumber} onChange={(event) => setVerifyNumber(event.target.value)} placeholder="+49123456789" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="verifyToken">Verification token</Label>
                      <Input id="verifyToken" value={verifyToken} onChange={(event) => setVerifyToken(event.target.value)} placeholder="123-456" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="verifyPin">Optional PIN</Label>
                      <Input id="verifyPin" value={verifyPin} onChange={(event) => setVerifyPin(event.target.value)} placeholder="Only if the account requires it" />
                    </div>
                    <Button
                      disabled={verifyMutation.isPending}
                      onClick={() =>
                        verifyMutation.mutate({
                          number: verifyNumber,
                          token: verifyToken,
                          pin: verifyPin || undefined,
                        })
                      }
                    >
                      {verifyMutation.isPending ? "Verifying…" : "Verify number"}
                    </Button>
                    {verifyMutation.isSuccess ? <Badge>Verification completed</Badge> : null}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {!activeAccountNumber ? (
          <StatusBanner title="Active account required" variant="warning">
            Select one of the discovered accounts above to unlock account-level settings, device maintenance, and unregister flows.
          </StatusBanner>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            <ActionFormCard
              badge={activeAccountNumber}
              description="Manage account-level credentials and discoverability settings without dropping into raw JSON."
              fields={[
                {
                  key: "pin",
                  label: "New PIN",
                  kind: "password",
                  placeholder: "1234",
                  description: "Use the upstream Set Pin endpoint for the active account.",
                },
              ]}
              initialValues={{ pin: "" }}
              onSubmit={async (values) => {
                const pin = String(values.pin ?? "").trim();
                if (!pin) {
                  throw new Error("Enter a PIN before submitting.");
                }
                const result = await setPinMutation.mutateAsync({
                  number: activeAccountNumber,
                  data: { pin },
                });
                return {
                  result,
                  reset: true,
                  feedback: {
                    variant: "success",
                    title: "PIN updated",
                    message: `A new PIN was submitted for ${activeAccountNumber}.`,
                  },
                };
              }}
              resetKey={`pin-${activeAccountNumber}`}
              submitLabel="Set PIN"
              title="PIN and username"
              footer={
                <div className="flex flex-wrap gap-3">
                  <Button
                    disabled={removePinMutation.isPending}
                    onClick={async () => {
                      await removePinMutation.mutateAsync({ number: activeAccountNumber });
                    }}
                    variant="secondary"
                  >
                    Remove PIN
                  </Button>
                </div>
              }
            />

            <ActionFormCard
              description="Set or remove the public Signal username for the active account."
              fields={[
                {
                  key: "username",
                  label: "Username",
                  kind: "text",
                  placeholder: "operator-node",
                },
              ]}
              initialValues={{ username: "" }}
              onSubmit={async (values) => {
                const username = String(values.username ?? "").trim();
                if (!username) {
                  throw new Error("Enter a username before submitting.");
                }
                const result = await setUsernameMutation.mutateAsync({
                  number: activeAccountNumber,
                  data: { username },
                });
                return {
                  result,
                  reset: true,
                  feedback: {
                    variant: "success",
                    title: "Username updated",
                    message: `The account username for ${activeAccountNumber} was updated.`,
                  },
                };
              }}
              resetKey={`username-${activeAccountNumber}`}
              submitLabel="Set username"
              title="Public username"
              footer={
                <Button
                  disabled={removeUsernameMutation.isPending}
                  onClick={async () => {
                    await removeUsernameMutation.mutateAsync({ number: activeAccountNumber });
                  }}
                  variant="secondary"
                >
                  Remove username
                </Button>
              }
            />

            <ActionFormCard
              description="Lift account rate limits after solving the upstream captcha challenge."
              fields={[
                {
                  key: "challengeToken",
                  label: "Challenge token",
                  kind: "text",
                  placeholder: "challenge-token",
                },
                {
                  key: "captcha",
                  label: "Captcha URI",
                  kind: "text",
                  placeholder: "signalcaptcha://...",
                },
              ]}
              initialValues={{ challengeToken: "", captcha: "" }}
              onSubmit={async (values) => {
                const challengeToken = String(values.challengeToken ?? "").trim();
                const captcha = String(values.captcha ?? "").trim();
                if (!challengeToken || !captcha) {
                  throw new Error("Both the challenge token and captcha URI are required.");
                }
                const result = await rateLimitMutation.mutateAsync({
                  number: activeAccountNumber,
                  data: {
                    challenge_token: challengeToken,
                    captcha,
                  },
                });
                return {
                  result,
                  reset: true,
                  feedback: {
                    variant: "success",
                    title: "Rate-limit challenge submitted",
                    message: "The captcha recovery request was accepted by the upstream API.",
                  },
                };
              }}
              resetKey={`challenge-${activeAccountNumber}`}
              submitLabel="Lift rate limit"
              title="Rate-limit recovery"
              warning="Only use this after the upstream API returns challenge tokens for the selected account."
            />

            <ActionFormCard
              description="Update discoverability and number-sharing preferences for the active account."
              fields={[
                {
                  key: "discoverable",
                  label: "Discoverable by number",
                  kind: "boolean",
                  description: "Controls whether the account can be found by phone number.",
                },
                {
                  key: "shareNumber",
                  label: "Share number",
                  kind: "boolean",
                  description: "Controls whether the number is shared in conversations.",
                },
              ]}
              initialValues={{ discoverable: false, shareNumber: false }}
              onSubmit={async (values) => {
                const result = await updateAccountSettingsMutation.mutateAsync({
                  number: activeAccountNumber,
                  data: {
                    discoverable_by_number: Boolean(values.discoverable),
                    share_number: Boolean(values.shareNumber),
                  },
                });
                return {
                  result,
                  feedback: {
                    variant: "success",
                    title: "Account settings saved",
                    message: "Discoverability preferences were sent to the Signal API.",
                  },
                };
              }}
              resetKey={`settings-${activeAccountNumber}`}
              submitLabel="Save account settings"
              title="Account settings"
            />

            <ActionFormCard
              badge={`${linkedDevices.length} devices`}
              description="Link an additional device by pasting a raw `sgnl://linkdevice` URI, or remove an existing linked device."
              fields={[
                {
                  key: "uri",
                  label: "Device link URI",
                  kind: "textarea",
                  placeholder: "sgnl://linkdevice?uuid=...",
                  rows: 4,
                },
                {
                  key: "deviceId",
                  label: "Linked device to remove",
                  kind: "select",
                  options: linkedDevices
                    .filter((device) => device.id && device.id !== 1)
                    .map((device) => ({
                      label: `${device.name || `Device ${device.id}`} • ${device.id}`,
                      value: String(device.id),
                    })),
                },
                {
                  key: "confirmRemoveDevice",
                  label: "I understand this linked device will be removed",
                  kind: "boolean",
                },
              ]}
              initialValues={{ uri: "", deviceId: "", confirmRemoveDevice: false }}
              onSubmit={async (values) => {
                const uri = String(values.uri ?? "").trim();
                if (!uri) {
                  throw new Error("Paste a raw device link URI first.");
                }
                const result = await addDeviceMutation.mutateAsync({
                  number: activeAccountNumber,
                  data: { uri },
                });
                await refreshAccountState();
                return {
                  result,
                  reset: true,
                  feedback: {
                    variant: "success",
                    title: "Device link submitted",
                    message: "The upstream API accepted the link-device request.",
                  },
                };
              }}
              resetKey={`add-device-${activeAccountNumber}`}
              submitLabel="Link pasted URI"
              title="Device maintenance"
              footer={({ values }) => (
                <Button
                  disabled={
                    !values.deviceId ||
                    !values.confirmRemoveDevice ||
                    removeDeviceMutation.isPending
                  }
                  onClick={async () => {
                    const deviceId = Number(values.deviceId);
                    await removeDeviceMutation.mutateAsync({
                      number: activeAccountNumber,
                      deviceId,
                    });
                    await refreshAccountState();
                  }}
                  variant="secondary"
                >
                  Remove selected device
                </Button>
              )}
            />

            <ActionFormCard
              description="Dangerous maintenance actions for the selected account. These are intentionally isolated and require explicit confirmation toggles."
              fields={[
                {
                  key: "ignoreRegistered",
                  label: "Ignore registered safeguard",
                  kind: "boolean",
                  description: "Allows local-data removal even when the account is still registered.",
                },
                {
                  key: "confirmLocalData",
                  label: "I understand the local device data will be deleted",
                  kind: "boolean",
                },
                {
                  key: "deleteAccount",
                  label: "Delete account on unregister",
                  kind: "boolean",
                },
                {
                  key: "deleteLocalData",
                  label: "Delete local data on unregister",
                  kind: "boolean",
                },
                {
                  key: "confirmUnregister",
                  label: "I understand unregister is destructive",
                  kind: "boolean",
                },
              ]}
              initialValues={{
                ignoreRegistered: false,
                confirmLocalData: false,
                deleteAccount: false,
                deleteLocalData: false,
                confirmUnregister: false,
              }}
              onSubmit={async () => ({
                feedback: {
                  variant: "info",
                  title: "Choose a danger action below",
                  message: "Use one of the explicit buttons to delete local data or unregister the selected account.",
                },
              })}
              resetKey={`danger-${activeAccountNumber}`}
              submitLabel="Review danger actions"
              submitVariant="secondary"
              title="Danger zone"
              warning="These actions can permanently remove local state or unregister the account from Signal."
              footer={({ values }) => (
                <div className="flex flex-wrap gap-3">
                  <Button
                    disabled={!values.confirmLocalData || deleteLocalDataMutation.isPending}
                    onClick={async () => {
                      await deleteLocalDataMutation.mutateAsync({
                        number: activeAccountNumber,
                        data: {
                          ignore_registered: Boolean(values.ignoreRegistered),
                        },
                      });
                      await refreshAccountState();
                    }}
                    variant="danger"
                  >
                    Delete local data
                  </Button>
                  <Button
                    disabled={!values.confirmUnregister || unregisterMutation.isPending}
                    onClick={async () => {
                      await unregisterMutation.mutateAsync({
                        number: activeAccountNumber,
                        data: {
                          delete_account: Boolean(values.deleteAccount),
                          delete_local_data: Boolean(values.deleteLocalData),
                        },
                      });
                      await refreshAccountState();
                    }}
                    variant="danger"
                  >
                    Unregister account
                  </Button>
                </div>
              )}
            />
          </div>
        )}
      </div>
    </RequireActiveProfile>
  );
}
