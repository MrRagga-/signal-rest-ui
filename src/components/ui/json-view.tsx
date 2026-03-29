import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export function JsonView({ value }: { value: unknown }) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!(value instanceof Blob)) {
      setBlobUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(value);
    setBlobUrl(objectUrl);
    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [value]);

  if (value instanceof Blob) {
    const isImage = value.type.startsWith("image/");

    return (
      <div className="space-y-4 rounded-[1.4rem] border border-white/8 bg-black/30 p-4 text-sm text-stone-200">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-semibold text-stone-100">Binary response</p>
            <p className="mt-1 text-xs text-stone-400">
              {value.type || "application/octet-stream"} • {value.size} bytes
            </p>
          </div>
          {blobUrl ? (
            <Button asChild size="sm" variant="secondary">
              <a download="signal-response" href={blobUrl}>
                Download
              </a>
            </Button>
          ) : null}
        </div>
        {isImage && blobUrl ? (
          <img
            alt="API response preview"
            className="max-h-[28rem] w-full rounded-[1.2rem] border border-white/8 bg-black/20 object-contain"
            src={blobUrl}
          />
        ) : null}
      </div>
    );
  }

  if (typeof value === "string") {
    return (
      <pre className="overflow-auto rounded-[1.4rem] border border-white/8 bg-black/30 p-4 text-xs leading-6 text-stone-200">
        {value}
      </pre>
    );
  }

  return (
    <pre className="overflow-auto rounded-[1.4rem] border border-white/8 bg-black/30 p-4 text-xs leading-6 text-stone-200">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}
