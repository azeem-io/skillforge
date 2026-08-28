import { cn } from "@/lib/utils";

/**
 * Typography for the two legal pages. Not `@tailwindcss/typography` — that is
 * a dependency and a token override for two documents, and these need to sit
 * on the app's own palette in both themes.
 */
export function LegalProse({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <article
      className={cn(
        "space-y-5 text-sm leading-relaxed",
        "[&_h2]:mt-9 [&_h2]:text-lg [&_h2]:font-semibold",
        "[&_h3]:mt-6 [&_h3]:text-base [&_h3]:font-medium",
        "[&_p]:text-muted-foreground",
        "[&_li]:text-muted-foreground [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5",
        "[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2",
        "[&_strong]:text-foreground [&_strong]:font-medium",
        "[&_table]:w-full [&_table]:text-left",
        "[&_th]:text-foreground [&_th]:py-2 [&_th]:pr-4 [&_th]:align-top [&_th]:font-medium",
        "[&_td]:text-muted-foreground [&_td]:border-border [&_td]:border-t [&_td]:py-2 [&_td]:pr-4 [&_td]:align-top",
        className,
      )}
    >
      {children}
    </article>
  );
}
