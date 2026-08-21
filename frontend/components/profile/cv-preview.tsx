import { Download, ExternalLink, FileText } from "lucide-react";

import type { Profile } from "@/lib/profile-types";

/** `?inline=1` asks profile-api to serve the bytes for rendering rather than
 *  download. It answers with a `sandbox allow-scripts` CSP: the frame is an
 *  opaque origin, so a PDF's own script cannot reach this app's cookies or
 *  storage, but the browser's PDF viewer can still run. */
function source(id: string, inline: boolean) {
  return `/api/profile/uploads/${id}${inline ? "?inline=1" : ""}`;
}

function size(bytes: number | null) {
  if (bytes === null) return null;
  const mb = bytes / 1024 / 1024;
  return mb >= 0.1 ? `${mb.toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

type Props = Pick<
  Profile,
  "cvUploadId" | "cvFilename" | "cvMimeType" | "cvSizeBytes"
>;

export function CvPreview({
  cvUploadId,
  cvFilename,
  cvMimeType,
  cvSizeBytes,
}: Props) {
  if (!cvUploadId) {
    return (
      <div className="border-border text-muted-foreground flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-6 py-10 text-center">
        <FileText className="size-6 opacity-60" aria-hidden />
        <p className="text-sm">No CV yet.</p>
        <p className="text-xs">Upload one and it will preview here.</p>
      </div>
    );
  }

  const isPdf = cvMimeType === "application/pdf";
  const isImage = cvMimeType?.startsWith("image/") ?? false;
  const label = cvFilename ?? "Your CV";
  const bytes = size(cvSizeBytes);

  return (
    <figure className="space-y-2">
      <div className="border-border bg-muted/40 overflow-hidden rounded-lg border">
        {isPdf && (
          <iframe
            src={source(cvUploadId, true)}
            title={`Preview of ${label}`}
            className="h-[26rem] w-full border-0 bg-white"
            // Matches the response's own sandbox CSP. `allow-scripts` is what
            // lets the browser's PDF viewer run at all; the absence of
            // `allow-same-origin` is what keeps it in an opaque origin.
            sandbox="allow-scripts"
            loading="lazy"
          />
        )}

        {isImage && (
          // Not next/image: the bytes are behind a session-checked route, not a
          // public asset, so there is nothing for the optimizer to fetch.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={source(cvUploadId, true)}
            alt={`Preview of ${label}`}
            className="mx-auto max-h-[26rem] w-auto max-w-full object-contain"
            loading="lazy"
          />
        )}

        {!isPdf && !isImage && (
          <div className="text-muted-foreground flex items-center justify-center gap-2 px-6 py-10 text-sm">
            <FileText className="size-4" aria-hidden />
            This file type cannot be previewed.
          </div>
        )}
      </div>

      <figcaption className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <span className="text-muted-foreground truncate text-xs">
          {label}
          {bytes && <> · {bytes}</>}
        </span>

        <span className="flex shrink-0 items-center gap-3 text-sm">
          <a
            href={source(cvUploadId, true)}
            target="_blank"
            rel="noreferrer"
            className="text-primary inline-flex items-center gap-1.5 hover:underline"
          >
            <ExternalLink className="size-4" aria-hidden /> Open full size
          </a>
          <a
            href={source(cvUploadId, false)}
            className="text-primary inline-flex items-center gap-1.5 hover:underline"
          >
            <Download className="size-4" aria-hidden /> Download
          </a>
        </span>
      </figcaption>
    </figure>
  );
}
