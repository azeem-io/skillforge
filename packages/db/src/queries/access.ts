import { and, eq } from "drizzle-orm";

import type { Database } from "../client";
import { mentorships } from "../schema/index";

/** As much of an identity as an authorization decision needs. */
export type Reader = { id: string; role: string };

/**
 * Whether `reader` may read `userId`'s rows. Reads only — a mentor may look,
 * never edit.
 *
 * A mentor's access is a join against `mentorships`, never a comparison against
 * the string "mentor": holding the role grants nothing on its own, only the
 * pairing does. Both profile-api and skill-service enforce it through here.
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
