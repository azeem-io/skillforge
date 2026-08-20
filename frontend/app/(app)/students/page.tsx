import Link from "next/link";
import { ArrowRight, Users } from "lucide-react";

import { RoleControls } from "@/components/staff/role-controls";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { mentorships, requireStaff, roster } from "@/lib/student";

export const dynamic = "force-dynamic";

export default async function StudentsPage() {
  const staff = await requireStaff();
  const isAdmin = staff.role === "admin";

  const [{ students }, pairs] = await Promise.all([
    roster(),
    isAdmin ? mentorships() : Promise.resolve({ mentorships: [] }),
  ]);

  const mentorsByStudent = new Map<string, string[]>();
  for (const pair of pairs.mentorships) {
    const list = mentorsByStudent.get(pair.studentId) ?? [];
    list.push(pair.mentorName ?? pair.mentorEmail);
    mentorsByStudent.set(pair.studentId, list);
  }

  const mentorOptions = students
    .filter((s) => s.role !== "student")
    .map((s) => ({ id: s.userId, label: s.name ?? s.email }));

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {isAdmin ? "All users" : "My students"}
        </h1>
        <p className="text-muted-foreground text-sm">
          {isAdmin
            ? "Everyone on the platform. Promote a student to mentor to let them review others."
            : "The students assigned to you. Readiness is against the goal each one chose."}
        </p>
      </div>

      {students.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="text-muted-foreground size-4" />
              Nobody assigned yet
            </CardTitle>
            <CardDescription>
              An admin assigns students to a mentor. Until then there is nothing
              to review here.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <div className="grid gap-3">
        {students.map((student) => (
          <Card key={student.userId}>
            <CardContent className="flex flex-wrap items-center gap-4 py-4">
              <div className="min-w-56 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    {student.name ?? student.email}
                  </span>
                  {student.role !== "student" && (
                    <Badge variant="secondary" className="capitalize">
                      {student.role}
                    </Badge>
                  )}
                </div>
                <p className="text-muted-foreground text-xs">{student.email}</p>
                {(mentorsByStudent.get(student.userId)?.length ?? 0) > 0 && (
                  <p className="text-muted-foreground mt-1 text-xs">
                    Mentored by {mentorsByStudent.get(student.userId)!.join(", ")}
                  </p>
                )}
              </div>

              <div className="w-44">
                <p className="text-muted-foreground text-xs">
                  {student.targetRoleName ?? "No goal set"}
                </p>
                {student.readiness !== null ? (
                  <>
                    <Progress className="mt-1 h-1.5" value={student.readiness} />
                    <p className="text-muted-foreground mt-1 text-xs tabular-nums">
                      {student.readiness}% ready · {student.demonstrated} skills
                    </p>
                  </>
                ) : (
                  <p className="text-muted-foreground mt-1 text-xs">
                    {student.demonstrated} skills demonstrated
                  </p>
                )}
              </div>

              {isAdmin && (
                <RoleControls
                  userId={student.userId}
                  role={student.role}
                  isSelf={student.userId === staff.userId}
                  mentors={mentorOptions.filter((m) => m.id !== student.userId)}
                  assigned={pairs.mentorships
                    .filter((p) => p.studentId === student.userId)
                    .map((p) => p.mentorId)}
                />
              )}

              <Button variant="outline" size="sm" asChild>
                <Link href={`/students/${student.userId}`}>
                  Open <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
