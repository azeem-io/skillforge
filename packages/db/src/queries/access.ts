import { and, eq } from "drizzle-orm";

import type { Database } from "../client";
import { mentorships } from "../schema/index";

/** As much of an identity as an authorization decision needs. */
export type Reader = { id: string; role: string };

/**
 * Whether `reader` may read `userId`'s rows.
 *
 * A mentor's access is a join against `mentorships`, never a comparison
 * against the string "mentor": holding the role grants nothing on its own,
 * only the pairing does. Lives here because two services enforce it — see
 * `requireReadAccess` in profile-api and in skill-service — and a second copy
 * of this rule is a second thing to get wrong.
 *
 * Reads only. A mentor may look, never edit.
 */
export async function canReadStudent(
  db: Database,
  reader: Reader,
  userId: string,
): Promise<boolean> {
  if (reader.id === userId || reader.role === "admin") return true;
  if (reader.role !== "mentor") return false;

  const [pair] = await db
    .select({ mentorId: mentorships.mentorId })
    .from(mentorships)
    .where(
      and(eq(mentorships.mentorId, reader.id), eq(mentorships.studentId, userId)),
    )
    .limit(1);

  return Boolean(pair);
}
