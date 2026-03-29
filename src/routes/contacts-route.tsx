import { startTransition, useDeferredValue, useState } from "react";
import { RefreshCcw } from "lucide-react";
import { useAppState } from "@/app/app-state";
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
import { Switch } from "@/components/ui/switch";
import { useGetV1ContactsNumberUuid, useGetV1ContactsNumberUuidAvatar, useGetV1IdentitiesNumber, usePutV1IdentitiesNumberTrustNumberToTrust } from "@/lib/api/generated/signal";
import {
  useContactsQuery,
  useSyncContactsMutation,
  useUpdateContactMutation,
} from "@/lib/api/signal-hooks";
import { getErrorMessage } from "@/lib/api/client";
import type { ContactRecord } from "@/lib/types";
import { RequireActiveAccount } from "@/routes/route-helpers";

type ContactsFeedback =
  | {
      variant: "success" | "error" | "info";
      title: string;
      message: string;
    }
  | null;

export function ContactsRoute() {
  const { activeAccountNumber } = useAppState();
  const [showAllRecipients, setShowAllRecipients] = useState(true);
  const contactsQuery = useContactsQuery(showAllRecipients);
  const updateMutation = useUpdateContactMutation();
  const syncMutation = useSyncContactsMutation();
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [contactName, setContactName] = useState("");
  const [contactRecipient, setContactRecipient] = useState("");
  const [selectedContact, setSelectedContact] = useState<ContactRecord | null>(null);
  const [feedback, setFeedback] = useState<ContactsFeedback>(null);
  const contactDetailQuery = useGetV1ContactsNumberUuid(
    activeAccountNumber ?? "",
    selectedContact?.uuid ?? "",
    {
      query: {
        enabled: Boolean(activeAccountNumber && selectedContact?.uuid),
      },
    },
  );
  const contactAvatarQuery = useGetV1ContactsNumberUuidAvatar(
    activeAccountNumber ?? "",
    selectedContact?.uuid ?? "",
    {
      query: {
        enabled: Boolean(activeAccountNumber && selectedContact?.uuid),
      },
    },
  );
  const identitiesQuery = useGetV1IdentitiesNumber(activeAccountNumber ?? "", {
    query: {
      enabled: Boolean(activeAccountNumber),
    },
  });
  const trustIdentityMutation = usePutV1IdentitiesNumberTrustNumberToTrust();

  const filteredContacts = (contactsQuery.data ?? []).filter((contact) => {
    const haystack =
      `${contact.name ?? ""} ${contact.profileName ?? ""} ${contact.number ?? ""} ${contact.username ?? ""} ${contact.uuid ?? ""}`.toLowerCase();
    return haystack.includes(deferredSearch.toLowerCase());
  });

  const saveContact = async () => {
    setFeedback(null);

    if (!contactName.trim() || !contactRecipient.trim()) {
      setFeedback({
        variant: "error",
        title: "Contact details required",
        message: "Provide both a display name and the recipient number or username before saving.",
      });
      return;
    }

    try {
      await updateMutation.mutateAsync({
        name: contactName.trim(),
        recipient: contactRecipient.trim(),
      });
      setFeedback({
        variant: "success",
        title: "Contact saved",
        message: `${contactName.trim()} is now stored for ${contactRecipient.trim()}.`,
      });
      setContactName("");
      setContactRecipient("");
    } catch (error) {
      setFeedback({
        variant: "error",
        title: "Could not save contact",
        message: getErrorMessage(error, "The contact update request failed."),
      });
    }
  };

  const syncContacts = async () => {
    setFeedback(null);

    try {
      await syncMutation.mutateAsync();
      setFeedback({
        variant: "success",
        title: "Sync message sent",
        message:
          "The contact sync request was accepted. This only works when the selected account is the primary device.",
      });
    } catch (error) {
      setFeedback({
        variant: "error",
        title: "Contact sync failed",
        message: getErrorMessage(
          error,
          "The selected account could not send a contact sync message.",
        ),
      });
    }
  };

  return (
    <RequireActiveAccount>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Contacts</CardTitle>
              <CardDescription>
                Search the account directory, pivot between saved contacts and all known recipients,
                and load entries back into the editor.
              </CardDescription>
            </div>
            {activeAccountNumber ? <Badge>{activeAccountNumber}</Badge> : null}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto]">
              <Input
                placeholder="Search by name, number, username, or UUID"
                value={search}
                onChange={(event) => startTransition(() => setSearch(event.target.value))}
              />
              <Button
                disabled={contactsQuery.isFetching}
                onClick={() => {
                  setFeedback(null);
                  contactsQuery.refetch();
                }}
                variant="secondary"
              >
                <RefreshCcw className="size-4" />
                Refresh list
              </Button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.3rem] border border-white/8 bg-white/[0.03] px-4 py-3">
              <div>
                <p className="font-semibold">Directory scope</p>
                <p className="mt-1 text-sm text-stone-400">
                  Toggle between saved contacts only and all recipients currently known to Signal.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-stone-300">
                  {showAllRecipients ? "All recipients" : "Saved contacts only"}
                </span>
                <Switch
                  checked={showAllRecipients}
                  onCheckedChange={(checked) => setShowAllRecipients(checked)}
                />
              </div>
            </div>

            {contactsQuery.error ? (
              <StatusBanner title="Could not load contacts" variant="error">
                {getErrorMessage(contactsQuery.error, "The contact list request failed.")}
              </StatusBanner>
            ) : null}

            <div className="flex flex-wrap items-center gap-2 text-sm text-stone-400">
              <Badge>{filteredContacts.length} visible</Badge>
              <span>{contactsQuery.data?.length ?? 0} loaded</span>
              {contactsQuery.isFetching ? <span>Refreshing…</span> : null}
            </div>

            {contactsQuery.isPending ? (
              <EmptyState
                title="Loading contacts"
                description="Querying the selected Signal account for contacts and recipients."
              />
            ) : filteredContacts.length ? (
              <div className="grid gap-3">
                {filteredContacts.map((contact) => (
                  <div
                    key={contact.uuid || contact.number || contact.username}
                    className="rounded-[1.4rem] border border-white/8 bg-white/[0.03] p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">
                          {contact.name || contact.profileName || "Unnamed contact"}
                        </p>
                        <p className="mt-1 text-sm text-stone-400">
                          {contact.number || contact.username || contact.uuid}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setFeedback({
                            variant: "info",
                            title: "Editor populated",
                            message:
                              "The selected contact has been copied into the editor on the right.",
                          });
                          setSelectedContact(contact);
                          setContactName(contact.name || contact.profileName || "");
                          setContactRecipient(contact.number || contact.username || "");
                        }}
                      >
                        Edit
                      </Button>
                    </div>
                    <div className="mt-3">
                      <JsonView value={contact} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No contacts matched"
                description="Try a broader search, switch the directory scope, or refresh the list from the active account."
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Contact actions</CardTitle>
              <CardDescription>
                Insert or update a contact entry explicitly, then send a manual sync to linked
                devices when needed.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="contactName">Display name</Label>
              <Input
                id="contactName"
                value={contactName}
                onChange={(event) => setContactName(event.target.value)}
                placeholder="Jane Example"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactRecipient">Recipient</Label>
              <Input
                id="contactRecipient"
                value={contactRecipient}
                onChange={(event) => setContactRecipient(event.target.value)}
                placeholder="+49123456789 or username"
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <Button disabled={updateMutation.isPending} onClick={saveContact}>
                {updateMutation.isPending ? "Saving…" : "Save contact"}
              </Button>
              <Button
                disabled={syncMutation.isPending}
                onClick={syncContacts}
                variant="secondary"
              >
                {syncMutation.isPending ? "Syncing…" : "Sync contacts"}
              </Button>
            </div>

            <StatusBanner title="Sync scope" variant="warning">
              The sync endpoint sends the current contact list to linked devices. Signal only accepts
              this when the selected account is the primary device.
            </StatusBanner>

            {feedback ? (
              <StatusBanner title={feedback.title} variant={feedback.variant}>
                {feedback.message}
              </StatusBanner>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Selected contact</CardTitle>
              <CardDescription>
                Load direct contact details and avatar data for the currently selected UUID-backed contact.
              </CardDescription>
            </div>
            {selectedContact ? (
              <Badge className="break-all text-[10px] tracking-[0.16em]">
                {selectedContact.name || selectedContact.number || selectedContact.uuid}
              </Badge>
            ) : null}
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedContact ? (
              <>
                {!selectedContact.uuid ? (
                  <StatusBanner title="UUID required" variant="warning">
                    The avatar and direct detail endpoints require a contact UUID. Pick a contact that exposes one in the directory list.
                  </StatusBanner>
                ) : null}
                <JsonView
                  value={
                    selectedContact.uuid
                      ? contactDetailQuery.data?.data ?? contactDetailQuery.error ?? { status: "Loading contact detail…" }
                      : selectedContact
                  }
                />
                {selectedContact.uuid ? (
                  <div>
                    <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.28em] text-stone-500">
                      Avatar preview
                    </p>
                    <JsonView
                      value={
                        contactAvatarQuery.data?.data ??
                        contactAvatarQuery.error ??
                        { status: "No avatar downloaded yet" }
                      }
                    />
                  </div>
                ) : null}
              </>
            ) : (
              <EmptyState
                title="No contact selected"
                description="Choose Edit on a contact row to load its detail and avatar panels."
              />
            )}
          </CardContent>
        </Card>

        <ActionFormCard
          badge={`${identitiesQuery.data?.data?.length ?? 0} identities`}
          description="Inspect known safety identities for the active account and explicitly trust the selected contact when required."
          fields={[
            {
              key: "numberToTrust",
              label: "Contact number to trust",
              kind: "text",
              placeholder: "+49123456789",
              description: "Defaults to the selected contact's phone number when available.",
            },
            {
              key: "verifiedSafetyNumber",
              label: "Verified safety number",
              kind: "textarea",
              rows: 3,
              placeholder: "Optional safety number for explicit verification",
            },
            {
              key: "trustAllKnownKeys",
              label: "Trust all known keys",
              kind: "boolean",
            },
          ]}
          initialValues={{
            numberToTrust: selectedContact?.number || "",
            verifiedSafetyNumber: "",
            trustAllKnownKeys: false,
          }}
          onSubmit={async (values) => {
            const numberToTrust = String(values.numberToTrust ?? "").trim();
            if (!numberToTrust) {
              throw new Error("Enter the contact number to trust.");
            }
            const result = await trustIdentityMutation.mutateAsync({
              number: activeAccountNumber!,
              numberToTrust,
              data: {
                trust_all_known_keys: Boolean(values.trustAllKnownKeys),
                verified_safety_number: String(values.verifiedSafetyNumber ?? "").trim() || undefined,
              },
            });
            await identitiesQuery.refetch();
            return {
              result,
              feedback: {
                variant: "success",
                title: "Identity trust updated",
                message: `Trust settings for ${numberToTrust} were sent to the Signal API.`,
              },
            };
          }}
          resetKey={`trust-${activeAccountNumber}-${selectedContact?.uuid ?? selectedContact?.number ?? "none"}`}
          submitLabel="Trust identity"
          title="Identity trust"
          warning="Use explicit safety-number verification when you need strict identity confirmation."
          footer={
            <div className="min-w-full">
              <JsonView
                value={
                  identitiesQuery.data?.data ??
                  identitiesQuery.error ??
                  { status: "No identities loaded yet." }
                }
              />
            </div>
          }
        />
      </div>
    </RequireActiveAccount>
  );
}
