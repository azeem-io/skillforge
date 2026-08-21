import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function Stub({ title, owner, blurb }: { title: string; owner: string; blurb: string }) {
  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <Card className="mt-4 border-dashed">
        <CardHeader>
          <CardTitle className="text-base">Not built yet — {owner}</CardTitle>
          <CardDescription>{blurb}</CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
