import Link from "next/link";
import { ArrowRight, ClipboardCheck, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/**
 * Shown until a student has demonstrated something. Readiness is 0% and every
 * node is a gap at that point, which is accurate but reads as an error — this
 * says the number is empty because the evidence is, and where to get some.
 */
export function FirstSteps({ roleName }: { roleName: string }) {
  return (
    <Card className="border-ring/40">
      <CardHeader>
        <CardTitle>Start here</CardTitle>
        <CardDescription>
          Nothing is on your profile yet, so your readiness for {roleName} is 0%
          and the whole graph shows as missing. Two ways to change that.
        </CardDescription>
      </CardHeader>

      <CardContent className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border p-4">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="text-muted-foreground size-4" />
            <span className="font-medium">Take an assessment</span>
          </div>
          <p className="text-muted-foreground mt-1 text-xs leading-snug">
            Scored per skill, so one sitting can move several nodes at once.
            This is the evidence the roadmap trusts most.
          </p>
          <Button size="sm" className="mt-3" asChild>
            <Link href="/assessments">
              Browse assessments <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        </div>

        <div className="rounded-lg border p-4">
          <div className="flex items-center gap-2">
            <UserRound className="text-muted-foreground size-4" />
            <span className="font-medium">Claim what you know</span>
          </div>
          <p className="text-muted-foreground mt-1 text-xs leading-snug">
            Self-reported levels count immediately and are replaced by an
            assessment result when you sit one.
          </p>
          <Button size="sm" variant="outline" className="mt-3" asChild>
            <Link href="/profile">
              Edit profile <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
