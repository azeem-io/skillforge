import { Users } from "lucide-react";

import { RosterTable, type RosterRow } from "@/components/staff/roster-table";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { mentorships, requireStaff, roster } from "@/lib/student";

import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Students" };

export default async function StudentsPage() {
  const staff = await requireStaff();
  const isAdmin = staff.role === "admin";

  const [{ students }, pairs] = await Promise.all([
    roster(),
    // A mentor's roster is already only their students, so the pairing adds
    // nothing there. An admin sees everyone and needs to know who covers whom.
    isAdmin ? mentorships() : Promise.resolve({ mentorships: [] }),
  ]);

  const mentorsByStudent = new Map<string, string[]>();
  const assignedByStudent: Record<string, string[]> = {};
  for (const pair of pairs.mentorships) {
    const names = mentorsByStudent.get(pair.studentId) ?? [];
    names.push(pair.mentorName ?? pair.mentorEmail);
    mentorsByStudent.set(pair.studentId, names);

    (assignedByStudent[pair.studentId] ??= []).push(pair.mentorId);
  }

  const rows: RosterRow[] = students.map((student) => ({
    ...student,
    mentors: mentorsByStudent.get(student.userId) ?? [],
  }));

  const mentorOptions = students
    .filter((student) => student.role !== "student")
    .map((student) => ({
      id: student.userId,
      label: student.name ?? student.email,
    }));

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">
          {isAdmin ? "All users" : "My students"}
        </h1>
        <p className="text-muted-foreground text-sm">
          {isAdmin
            ? "Everyone on the platform. Promote a student to mentor to let them review others."
            : "The students assigned to you. Readiness is against the goal each one chose."}
        </p>
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="text-muted-foreground size-4" />
              {isAdmin ? "Nobody has registered yet" : "Nobody assigned yet"}
            </CardTitle>
            <CardDescription>
              {isAdmin
                ? "Everyone who registers arrives as a student and will appear here."
                : "An admin assigns students to a mentor. Until then there is nothing to review."}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <RosterTable
          rows={rows}
          isAdmin={isAdmin}
          selfId={staff.userId}
          mentorOptions={mentorOptions}
          assignedByStudent={assignedByStudent}
        />
      )}
    </div>
  );
}
