import { useMutation } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
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
import { Textarea } from "@/components/ui/textarea";
import { getV1SearchNumber, useDeleteV1PollsNumber, useDeleteV1ReactionsNumber, useDeleteV1RemoteDeleteNumber, useDeleteV1TypingIndicatorNumber, useGetV1StickerPacksNumber, usePostV1PollsNumber, usePostV1PollsNumberVote, usePostV1ReceiptsNumber, usePostV1ReactionsNumber, usePostV1Send, usePostV1StickerPacksNumber, usePutV1TypingIndicatorNumber } from "@/lib/api/generated/signal";
import { useContactsQuery, useReceiveMessagesMutation, useSendMessageMutation } from "@/lib/api/signal-hooks";
import { splitCsv } from "@/lib/utils";
import { RequireActiveProfile } from "@/routes/route-helpers";

const sendSchema = z.object({
  recipients: z.string().min(1, "Add at least one recipient"),
  message: z.string().min(1, "Message text is required"),
  textMode: z.enum(["normal", "styled"]),
});

type SendFormValues = z.infer<typeof sendSchema>;

export function MessagesRoute() {
  const { activeAccountNumber, activeProfile } = useAppState();
  const contactsQuery = useContactsQuery();
  const sendMutation = useSendMessageMutation();
  const receiveMutation = useReceiveMessagesMutation();
  const legacySendMutation = usePostV1Send();
  const showTypingMutation = usePutV1TypingIndicatorNumber();
  const hideTypingMutation = useDeleteV1TypingIndicatorNumber();
  const addReactionMutation = usePostV1ReactionsNumber();
  const removeReactionMutation = useDeleteV1ReactionsNumber();
  const receiptMutation = usePostV1ReceiptsNumber();
  const remoteDeleteMutation = useDeleteV1RemoteDeleteNumber();
  const createPollMutation = usePostV1PollsNumber();
  const closePollMutation = useDeleteV1PollsNumber();
  const votePollMutation = usePostV1PollsNumberVote();
  const stickerPackQuery = useGetV1StickerPacksNumber(activeAccountNumber ?? "", {
    query: { enabled: Boolean(activeAccountNumber) },
  });
  const addStickerPackMutation = usePostV1StickerPacksNumber();
  const searchMutation = useMutation({
    mutationFn: (numbers: string[]) => {
      if (!activeAccountNumber) {
        throw new Error("Select an active account first.");
      }
      return getV1SearchNumber(activeAccountNumber, { numbers });
    },
  });
  const [attachments, setAttachments] = useState<string[]>([]);
  const [receivedMessages, setReceivedMessages] = useState<unknown[]>([]);

  const form = useForm<SendFormValues>({
    resolver: zodResolver(sendSchema),
    defaultValues: {
      recipients: "",
      message: "",
      textMode: "normal",
    },
  });

  const suggestedRecipients = useMemo(
    () =>
      (contactsQuery.data ?? [])
        .slice(0, 10)
        .map((contact) => ({
          label: contact.name || contact.profileName || contact.username || contact.number || "Unknown",
          value: contact.number || contact.uuid || "",
        }))
        .filter((contact) => contact.value),
    [contactsQuery.data],
  );

  const onSubmit = form.handleSubmit(async (values) => {
    if (!activeAccountNumber) {
      form.setError("recipients", {
        message: "Choose an active account first.",
      });
      return;
    }

    await sendMutation.mutateAsync({
      number: activeAccountNumber,
      recipients: splitCsv(values.recipients),
      message: values.message,
      text_mode: values.textMode,
      base64_attachments: attachments.length ? attachments : undefined,
    });
    form.reset({
      recipients: "",
      message: "",
      textMode: values.textMode,
    });
    setAttachments([]);
  });

  return (
    <RequireActiveProfile>
      <div className="space-y-4">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Compose and deliver</CardTitle>
                <CardDescription>
                  Use `/v2/send` for attachments and formatted text while keeping delivery state explicit.
                </CardDescription>
              </div>
              {activeAccountNumber ? <Badge>{activeAccountNumber}</Badge> : null}
            </CardHeader>
            <CardContent>
              {activeAccountNumber ? null : (
                <EmptyState
                  className="mb-4"
                  title="No active account selected"
                  description="Open the Accounts page and choose the account that should send messages."
                />
              )}
              <form className="space-y-5" onSubmit={onSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="recipients">Recipients</Label>
                  <Input
                    id="recipients"
                    placeholder="+49123456789, +49123456780"
                    {...form.register("recipients")}
                  />
                  <p className="text-sm text-stone-500">
                    Use comma-separated phone numbers, usernames, or group IDs.
                  </p>
                </div>

                {suggestedRecipients.length ? (
                  <div className="flex flex-wrap gap-2">
                    {suggestedRecipients.map((recipient) => (
                      <button
                        key={recipient.value}
                        className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-stone-300 hover:border-emerald-300/30 hover:text-white"
                        type="button"
                        onClick={() => {
                          const current = splitCsv(form.getValues("recipients"));
                          if (!current.includes(recipient.value)) {
                            form.setValue("recipients", [...current, recipient.value].join(", "));
                          }
                        }}
                      >
                        {recipient.label}
                      </button>
                    ))}
                  </div>
                ) : null}

                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea id="message" placeholder="Test via Signal API!" {...form.register("message")} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="textMode">Text mode</Label>
                  <select
                    className="h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-stone-100"
                    id="textMode"
                    {...form.register("textMode")}
                  >
                    <option value="normal">normal</option>
                    <option value="styled">styled</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="attachments">Attachments</Label>
                  <Input
                    id="attachments"
                    type="file"
                    multiple
                    onChange={async (event) => {
                      const files = Array.from(event.target.files ?? []);
                      const next = await Promise.all(files.map(fileToBase64));
                      setAttachments(next);
                    }}
                  />
                  {attachments.length ? (
                    <p className="text-sm text-stone-400">{attachments.length} attachment(s) encoded for send.</p>
                  ) : null}
                </div>

                <div className="flex items-center gap-3">
                  <Button disabled={sendMutation.isPending || !activeAccountNumber} type="submit">
                    {sendMutation.isPending ? "Sending…" : "Send message"}
                  </Button>
                  {sendMutation.data?.timestamp ? (
                    <Badge>timestamp {sendMutation.data.timestamp}</Badge>
                  ) : null}
                </div>
              </form>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Manual receive</CardTitle>
                  <CardDescription>
                    Keep auto-receive opt-in. Pull messages deliberately and inspect the raw envelope payloads.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-[1.3rem] border border-amber-200/12 bg-amber-300/8 p-4 text-sm text-amber-50">
                  Profile preference for auto-receive is currently{" "}
                  <strong>{activeProfile?.autoReceiveEnabled ? "enabled" : "disabled"}</strong>. The UI does not schedule receive automatically.
                </div>
                <Button
                  disabled={receiveMutation.isPending || !activeAccountNumber}
                  onClick={async () => {
                    const result = await receiveMutation.mutateAsync({
                      timeout: 5,
                      maxMessages: 20,
                    });
                    setReceivedMessages(Array.isArray(result) ? result : [result]);
                  }}
                  variant="secondary"
                >
                  {receiveMutation.isPending ? "Receiving…" : "Receive now"}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Received payloads</CardTitle>
                  <CardDescription>
                    Raw messages are shown as-is so operators can inspect edge cases quickly.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <JsonView value={receivedMessages.length ? receivedMessages : { status: "No messages fetched yet" }} />
              </CardContent>
            </Card>
          </div>
        </div>

        {activeAccountNumber ? (
          <div className="grid gap-4 xl:grid-cols-2">
            <ActionFormCard
              description="Fallback delivery through `/v1/send` for simple single-attachment payloads."
              fields={[
                { key: "recipients", label: "Recipients", kind: "csv", placeholder: "+49123456789, group-id" },
                { key: "message", label: "Message", kind: "textarea", rows: 4, placeholder: "Legacy send payload" },
                { key: "isGroup", label: "Treat recipients as groups", kind: "boolean" },
                { key: "attachment", label: "Single attachment", kind: "file" },
              ]}
              initialValues={{ recipients: [], message: "", isGroup: false, attachment: "" }}
              onSubmit={async (values) => {
                const recipients = Array.isArray(values.recipients) ? values.recipients : [];
                if (!recipients.length) {
                  throw new Error("Add at least one recipient.");
                }
                const result = await legacySendMutation.mutateAsync({
                  data: {
                    number: activeAccountNumber,
                    recipients,
                    message: String(values.message ?? ""),
                    is_group: Boolean(values.isGroup),
                    base64_attachment: String(values.attachment || "") || undefined,
                  },
                });
                return {
                  result,
                  feedback: {
                    variant: "success",
                    title: "Legacy message sent",
                    message: "The `/v1/send` request completed.",
                  },
                };
              }}
              resetKey={`legacy-send-${activeAccountNumber}`}
              submitLabel="Send via /v1/send"
              title="Legacy send"
            />

            <ActionFormCard
              description="Show or hide typing state for a single recipient without leaving the UI."
              fields={[
                { key: "recipient", label: "Recipient", kind: "text", placeholder: "+49123456789 or username" },
                { key: "confirmHide", label: "Allow hide action", kind: "boolean" },
              ]}
              initialValues={{ recipient: "", confirmHide: false }}
              onSubmit={async (values) => {
                const recipient = String(values.recipient ?? "").trim();
                if (!recipient) {
                  throw new Error("Enter a recipient first.");
                }
                const result = await showTypingMutation.mutateAsync({
                  number: activeAccountNumber,
                  data: { recipient },
                });
                return {
                  result,
                  feedback: {
                    variant: "success",
                    title: "Typing indicator shown",
                    message: `Signal was instructed to show typing state for ${recipient}.`,
                  },
                };
              }}
              resetKey={`typing-${activeAccountNumber}`}
              submitLabel="Show typing indicator"
              title="Typing indicator"
              footer={({ values }) => (
                <Button
                  disabled={!values.confirmHide || hideTypingMutation.isPending}
                  onClick={async () => {
                    const recipient = String(values.recipient ?? "").trim();
                    if (!recipient) {
                      return;
                    }
                    await hideTypingMutation.mutateAsync({
                      number: activeAccountNumber,
                      data: { recipient },
                    });
                  }}
                  variant="secondary"
                >
                  Hide typing indicator
                </Button>
              )}
            />

            <ActionFormCard
              description="React to a message, remove a previous reaction, or send an explicit read/viewed receipt."
              fields={[
                { key: "recipient", label: "Recipient", kind: "text", placeholder: "+49123456789 or group-id" },
                { key: "targetAuthor", label: "Target author", kind: "text", placeholder: "+49123456789" },
                { key: "timestamp", label: "Target timestamp", kind: "number", placeholder: "1769271479" },
                {
                  key: "reaction",
                  label: "Reaction",
                  kind: "text",
                  placeholder: "👍",
                },
                {
                  key: "receiptType",
                  label: "Receipt type",
                  kind: "select",
                  options: [
                    { label: "read", value: "read" },
                    { label: "viewed", value: "viewed" },
                  ],
                },
              ]}
              initialValues={{ recipient: "", targetAuthor: "", timestamp: "", reaction: "👍", receiptType: "read" }}
              onSubmit={async (values) => {
                const recipient = String(values.recipient ?? "").trim();
                const targetAuthor = String(values.targetAuthor ?? "").trim();
                const timestamp = Number(values.timestamp);
                if (!recipient || !targetAuthor || !timestamp) {
                  throw new Error("Recipient, target author, and timestamp are required.");
                }
                const result = await addReactionMutation.mutateAsync({
                  number: activeAccountNumber,
                  data: {
                    recipient,
                    target_author: targetAuthor,
                    timestamp,
                    reaction: String(values.reaction ?? "👍"),
                  },
                });
                return {
                  result,
                  feedback: {
                    variant: "success",
                    title: "Reaction sent",
                    message: "The reaction request completed.",
                  },
                };
              }}
              resetKey={`reaction-${activeAccountNumber}`}
              submitLabel="Send reaction"
              title="Reactions and receipts"
              footer={({ values }) => (
                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={async () => {
                      const recipient = String(values.recipient ?? "").trim();
                      const targetAuthor = String(values.targetAuthor ?? "").trim();
                      const timestamp = Number(values.timestamp);
                      if (!recipient || !targetAuthor || !timestamp) {
                        return;
                      }
                      await removeReactionMutation.mutateAsync({
                        number: activeAccountNumber,
                        data: {
                          recipient,
                          target_author: targetAuthor,
                          timestamp,
                          reaction: String(values.reaction ?? "👍"),
                        },
                      });
                    }}
                    variant="secondary"
                  >
                    Remove reaction
                  </Button>
                  <Button
                    onClick={async () => {
                      const recipient = String(values.recipient ?? "").trim();
                      const timestamp = Number(values.timestamp);
                      if (!recipient || !timestamp) {
                        return;
                      }
                      await receiptMutation.mutateAsync({
                        number: activeAccountNumber,
                        data: {
                          recipient,
                          timestamp,
                          receipt_type: String(values.receiptType ?? "read") as "read" | "viewed",
                        },
                      });
                    }}
                    variant="secondary"
                  >
                    Send receipt
                  </Button>
                </div>
              )}
            />

            <ActionFormCard
              description="Create polls, vote on them, or close an existing poll from the same control group."
              fields={[
                { key: "recipient", label: "Recipient or group", kind: "text", placeholder: "group-id or +49123456789" },
                { key: "question", label: "Question", kind: "text", placeholder: "What should we ship next?" },
                { key: "answers", label: "Answers", kind: "csv", placeholder: "Option A, Option B, Option C" },
                { key: "allowMultiple", label: "Allow multiple selections", kind: "boolean" },
                { key: "pollTimestamp", label: "Poll timestamp", kind: "number", placeholder: "1769271479" },
                { key: "voteAnswers", label: "Vote answers", kind: "csv", placeholder: "Option A, Option B" },
              ]}
              initialValues={{
                recipient: "",
                question: "",
                answers: [],
                allowMultiple: false,
                pollTimestamp: "",
                voteAnswers: [],
              }}
              onSubmit={async (values) => {
                const recipient = String(values.recipient ?? "").trim();
                const question = String(values.question ?? "").trim();
                const answers = Array.isArray(values.answers) ? values.answers : [];
                if (!recipient || !question || !answers.length) {
                  throw new Error("Recipient, question, and at least one answer are required.");
                }
                const result = await createPollMutation.mutateAsync({
                  number: activeAccountNumber,
                  data: {
                    recipient,
                    question,
                    answers,
                    allow_multiple_selections: Boolean(values.allowMultiple),
                  },
                });
                return {
                  result,
                  feedback: {
                    variant: "success",
                    title: "Poll created",
                    message: "The poll request was accepted.",
                  },
                };
              }}
              resetKey={`poll-${activeAccountNumber}`}
              submitLabel="Create poll"
              title="Poll controls"
              footer={({ values }) => (
                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={async () => {
                      const recipient = String(values.recipient ?? "").trim();
                      const pollTimestamp = Number(values.pollTimestamp);
                      const voteAnswers = Array.isArray(values.voteAnswers) ? values.voteAnswers : [];
                      if (!recipient || !pollTimestamp || !voteAnswers.length) {
                        return;
                      }
                      await votePollMutation.mutateAsync({
                        number: activeAccountNumber,
                        data: {
                          recipient,
                          poll_timestamp: String(pollTimestamp),
                          answers: voteAnswers,
                        },
                      });
                    }}
                    variant="secondary"
                  >
                    Vote on poll
                  </Button>
                  <Button
                    onClick={async () => {
                      const recipient = String(values.recipient ?? "").trim();
                      const pollTimestamp = Number(values.pollTimestamp);
                      if (!recipient || !pollTimestamp) {
                        return;
                      }
                      await closePollMutation.mutateAsync({
                        number: activeAccountNumber,
                        data: {
                          recipient,
                          poll_timestamp: String(pollTimestamp),
                        },
                      });
                    }}
                    variant="secondary"
                  >
                    Close poll
                  </Button>
                </div>
              )}
            />

            <ActionFormCard
              description="Search Signal registration for multiple numbers and issue remote-delete requests for already-sent messages."
              fields={[
                { key: "numbers", label: "Numbers to check", kind: "csv", placeholder: "+49123456789, +49123456780" },
                { key: "recipient", label: "Remote delete recipient", kind: "text", placeholder: "+49123456789 or group-id" },
                { key: "timestamp", label: "Message timestamp", kind: "number", placeholder: "1769271479" },
              ]}
              initialValues={{ numbers: [], recipient: "", timestamp: "" }}
              onSubmit={async (values) => {
                const numbers = Array.isArray(values.numbers) ? values.numbers : [];
                if (!numbers.length) {
                  throw new Error("Add at least one number to search.");
                }
                const result = await searchMutation.mutateAsync(numbers);
                return {
                  result,
                  feedback: {
                    variant: "success",
                    title: "Search completed",
                    message: `Checked ${numbers.length} number(s) against Signal registration.`,
                  },
                };
              }}
              resetKey={`search-${activeAccountNumber}`}
              submitLabel="Search registration"
              title="Search and remote delete"
              footer={({ values }) => (
                <Button
                  onClick={async () => {
                    const recipient = String(values.recipient ?? "").trim();
                    const timestamp = Number(values.timestamp);
                    if (!recipient || !timestamp) {
                      return;
                    }
                    await remoteDeleteMutation.mutateAsync({
                      number: activeAccountNumber,
                      data: { recipient, timestamp },
                    });
                  }}
                  variant="secondary"
                >
                  Remote delete
                </Button>
              )}
            />

            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Sticker packs</CardTitle>
                  <CardDescription>
                    List installed packs for the active account and add a new pack by ID/key.
                  </CardDescription>
                </div>
                <Badge>{stickerPackQuery.data?.data?.length ?? 0} packs</Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                <ActionFormCard
                  description="Install a sticker pack that has already been shared or published."
                  fields={[
                    { key: "packId", label: "Pack ID", kind: "text", placeholder: "9a32eda01a7a28574f2eb48668ae0dc4" },
                    { key: "packKey", label: "Pack key", kind: "text", placeholder: "19546e18eba0ff69..." },
                  ]}
                  initialValues={{ packId: "", packKey: "" }}
                  onSubmit={async (values) => {
                    const packId = String(values.packId ?? "").trim();
                    const packKey = String(values.packKey ?? "").trim();
                    if (!packId || !packKey) {
                      throw new Error("Both pack ID and pack key are required.");
                    }
                    const result = await addStickerPackMutation.mutateAsync({
                      number: activeAccountNumber,
                      data: {
                        pack_id: packId,
                        pack_key: packKey,
                      },
                    });
                    await stickerPackQuery.refetch();
                    return {
                      result,
                      reset: true,
                      feedback: {
                        variant: "success",
                        title: "Sticker pack added",
                        message: "The sticker pack install request completed.",
                      },
                    };
                  }}
                  resetKey={`sticker-${activeAccountNumber}`}
                  submitLabel="Add sticker pack"
                  title="Install sticker pack"
                />

                <JsonView
                  value={
                    stickerPackQuery.data?.data ??
                    stickerPackQuery.error ??
                    { status: "No sticker packs loaded yet." }
                  }
                />
              </CardContent>
            </Card>
          </div>
        ) : null}
      </div>
    </RequireActiveProfile>
  );
}

async function fileToBase64(file: File) {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
  return dataUrl;
}
