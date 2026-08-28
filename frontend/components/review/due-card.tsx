import Link from "next/link";
import { ArrowRight, CalendarClock } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/**
 * The schedule, made visible. FSRS has been computing decay per skill since
 * assessments shipped; until this card existed no student was ever told, so
 * the spacing was calculated and then quietly ignored.
 *
 * Renders nothing at zero rather than an empty-state: "0 due" is not news, and
 * a permanent card saying nothing is how a nudge stops being read.
 */
export function DueCard({ count }: { count: number }) {
  if (count === 0) return null;

  return (
    <Card className="border-ring/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarClock className="text-muted-foreground size-4" />
          {count} {count === 1 ? "skill is" : "skills are"} due for review
        </CardTitle>
        <CardDescription>
          These were scheduled to come back around now — far enough after you
          last showed them that recalling one is work, which is what makes it
          stick. A short session beats a long one later.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button size="sm" asChild>
          <Link href="/review">
            Start review <ArrowRight className="size-3.5" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
