import { randomUUID } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";

import { profiles, uploads } from "@skillforge/db/schema";
import { requireUser } from "@skillforge/service-kit";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";

import { db, env, requireReadAccess, type Vars } from "../context";

export const uploadRoutes = new Hono<Vars>();

const MAX_BYTES = 5 * 1024 * 1024;

/**
 * An allowlist, not a blocklist, and keyed on the type rather than on the
 * filename: a browser-supplied extension is a label, not evidence.
 */
const ALLOWED = new Map([
  ["application/pdf", ".pdf"],
  ["image/png", ".png"],
  ["image/jpeg", ".jpg"],
]);

/**
 * Types `?inline=1` will render rather than force a download. A subset of
 * ALLOWED, named separately so widening the upload allowlist later is not
 * silently also a decision to render the new type in a frame.
 */
const PREVIEWABLE = new Set(["application/pdf", "image/png", "image/jpeg"]);

uploadRoutes.post("/uploads", async (c) => {
  const actor = requireUser(c);

  const form = await c.req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    throw new HTTPException(400, { message: "Expected a multipart field named 'file'" });
  }

  if (file.size === 0) throw new HTTPException(400, { message: "Empty file" });
  if (file.size > MAX_BYTES) {
    throw new HTTPException(413, { message: "File is larger than 5MB" });
  }

  const extension = ALLOWED.get(file.type);
  if (!extension) {
    throw new HTTPException(415, {
      message: `Unsupported type. Allowed: ${[...ALLOWED.keys()].join(", ")}`,
    });
  }

  // The stored name is generated, never the one the client sent — an uploaded
  // "../../etc/passwd" is a path, not a filename.
  const storageKey = `${actor.id}/${randomUUID()}${extension}`;
  const destination = join(env.uploadDir, storageKey);
  await mkdir(join(env.uploadDir, actor.id), { recursive: true });
  await writeFile(destination, Buffer.from(await file.arrayBuffer()));

  const [created] = await db
    .insert(uploads)
    .values({
      userId: actor.id,
      filename: file.name.slice(0, 255) || `upload${extension}`,
      mimeType: file.type,
      sizeBytes: file.size,
      storageKey,
    })
    .returning({ id: uploads.id, filename: uploads.filename });

  const purpose = form?.get("purpose");
  if (purpose === "cv") {
    await db
      .insert(profiles)
      .values({ userId: actor.id, cvUploadId: created!.id })
      .onConflictDoUpdate({
        target: profiles.userId,
        set: { cvUploadId: created!.id },
      });
  }

  return c.json({ upload: created }, 201);
});

uploadRoutes.get("/uploads", async (c) => {
  const actor = requireUser(c);
  const rows = await db
    .select({
      id: uploads.id,
      filename: uploads.filename,
      mimeType: uploads.mimeType,
      sizeBytes: uploads.sizeBytes,
      createdAt: uploads.createdAt,
    })
    .from(uploads)
    .where(eq(uploads.userId, actor.id));
  return c.json({ uploads: rows });
});

uploadRoutes.get("/uploads/:id", async (c) => {
  const actor = requireUser(c);

  const [row] = await db
    .select({
      userId: uploads.userId,
      filename: uploads.filename,
      mimeType: uploads.mimeType,
      storageKey: uploads.storageKey,
    })
    .from(uploads)
    .where(eq(uploads.id, c.req.param("id")));

  if (!row) throw new HTTPException(404, { message: "No such upload" });
  // Ownership is checked against the row, after the lookup — an id alone is
  // not permission to read the file it points at.
  if (row.userId !== actor.id) await requireReadAccess(c, row.userId);

  const file = Bun.file(join(env.uploadDir, row.storageKey));
  if (!(await file.exists())) {
    throw new HTTPException(410, { message: "File is no longer on disk" });
  }

  // `attachment` stays the default: a PDF rendered in the origin's own context
  // is a script execution surface. `?inline=1` is the opt-in the CV preview
  // uses, and it is only safe because of the sandbox header below.
  const inline = c.req.query("inline") === "1" && PREVIEWABLE.has(row.mimeType);
  const disposition = inline ? "inline" : "attachment";

  return new Response(file.stream(), {
    headers: {
      "content-type": row.mimeType,
      "content-disposition": `${disposition}; filename="${encodeURIComponent(row.filename)}"`,
      // Opaque origin, but not a dead one. `allow-scripts` is required: every
      // browser PDF viewer is itself script-driven (pdf.js, PDFium), so a bare
      // `sandbox` renders the viewer chrome around a permanently blank page.
      // What must never be added is `allow-same-origin` — withholding it is
      // what keeps the frame in an origin that shares no cookies, no storage
      // and no DOM with the app, so a PDF's own script has nothing to reach
      // for. The two tokens together would undo the sandbox entirely.
      ...(inline
        ? {
            "content-security-policy": "sandbox allow-scripts",
            // The type came off our own allowlist at upload time; refuse to let
            // a browser re-guess it into something executable.
            "x-content-type-options": "nosniff",
          }
        : {}),
    },
  });
});

uploadRoutes.delete("/uploads/:id", async (c) => {
  const actor = requireUser(c);
  const deleted = await db
    .delete(uploads)
    .where(and(eq(uploads.id, c.req.param("id")), eq(uploads.userId, actor.id)))
    .returning({ id: uploads.id, storageKey: uploads.storageKey });

  if (deleted.length === 0) throw new HTTPException(404, { message: "No such upload" });

  // The row was the only thing pointing at the file. Without this a deleted CV
  // stays on the volume forever, which makes "delete" a lie in the one place
  // it most needs not to be.
  await rm(join(env.uploadDir, deleted[0]!.storageKey), { force: true });

  return c.json({ ok: true });
});
