import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { useAttachmentPreviewMutation, useAttachmentsQuery, useDeleteAttachmentMutation } from "@/lib/api/signal-hooks";
import { RequireActiveProfile } from "@/routes/route-helpers";

export function AttachmentsRoute() {
  const attachmentsQuery = useAttachmentsQuery();
  const deleteMutation = useDeleteAttachmentMutation();
  const previewMutation = useAttachmentPreviewMutation();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!previewMutation.data) {
      return;
    }
    const objectUrl = URL.createObjectURL(previewMutation.data);
    setPreviewUrl(objectUrl);
    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [previewMutation.data]);

  return (
    <RequireActiveProfile>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Attachments</CardTitle>
              <CardDescription>
                List, preview, and delete files downloaded by the target API.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {attachmentsQuery.data?.length ? (
              attachmentsQuery.data.map((attachment) => (
                <div
                  key={attachment.id}
                  className="flex items-center justify-between gap-4 rounded-[1.4rem] border border-white/8 bg-white/[0.03] p-4"
                >
                  <div>
                    <p className="font-semibold">{attachment.name}</p>
                    <p className="mt-1 font-mono text-xs text-stone-500">{attachment.id}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      onClick={() => attachment.id && previewMutation.mutate(attachment.id)}
                    >
                      Preview
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => attachment.id && deleteMutation.mutate(attachment.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState
                title="No attachments found"
                description="Attachments appear here after message retrieval in modes that download them."
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Attachment preview</CardTitle>
              <CardDescription>
                Blob-based preview works for direct and proxy transport modes.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {previewUrl ? (
              <img alt="Attachment preview" className="w-full rounded-[1.6rem] border border-white/8 bg-black/20" src={previewUrl} />
            ) : (
              <div className="rounded-[1.5rem] border border-dashed border-white/12 bg-white/[0.03] p-6 text-sm text-stone-400">
                Select an attachment to preview it in-browser.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </RequireActiveProfile>
  );
}
