"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { FileText, Loader2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";

/** Mirrors the allowlist in profile-api. Stated here so the file picker filters
 *  rather than letting the upload fail after the bytes have been sent. */
const ACCEPT = "application/pdf,image/png,image/jpeg";
const MAX_BYTES = 5 * 1024 * 1024;

export function CvUpload({ cvUploadId }: { cvUploadId: string | null }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    if (file.size > MAX_BYTES) {
      setError("That file is larger than 5MB.");
      return;
    }

    setPending(true);
    setError(null);

    // FormData, not JSON — the body is a file, and apiFetch would stringify it.
    const form = new FormData();
    form.append("file", file);
    form.append("purpose", "cv");

    const response = await fetch("/api/profile/uploads", {
      method: "POST",
      body: form,
      credentials: "same-origin",
    }).catch(() => null);

    setPending(false);

    if (!response?.ok) {
      const message = await response
        ?.json()
        .then((data: { error?: string }) => data.error)
        .catch(() => null);
      setError(message ?? "Upload failed.");
      return;
    }

    router.refresh();
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={input}
          type="file"
          accept={ACCEPT}
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void upload(file);
            event.target.value = "";
          }}
        />
        <Button
          variant="outline"
          disabled={pending}
          onClick={() => input.current?.click()}
        >
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Upload className="size-4" />
          )}
          {cvUploadId ? "Replace CV" : "Upload CV"}
        </Button>

        {cvUploadId && (
          <a
            href={`/api/profile/uploads/${cvUploadId}`}
            className="text-primary inline-flex items-center gap-1.5 text-sm hover:underline"
          >
            <FileText className="size-4" /> Download current CV
          </a>
        )}
      </div>

      <p className="text-muted-foreground text-xs">
        PDF, PNG or JPEG, up to 5MB.
      </p>

      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
    </div>
  );
}
