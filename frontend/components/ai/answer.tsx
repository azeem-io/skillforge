"use client";

import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

import { cn } from "@/lib/utils";

// The model cites retrieved chunks inline as [1], [2]. Rendering those as
// chips rather than leaving them as literal brackets is what ties the prose to
// the source list under it, which is the only reason to show retrieval at all.
const CITATION = /\[(\d{1,2})\]/g;

function Cite({
  n,
  active,
  onActivate,
}: {
  n: number;
  active: boolean;
  onActivate: (n: number | null) => void;
}) {
  return (
    <button
      type="button"
      onMouseEnter={() => onActivate(n)}
      onMouseLeave={() => onActivate(null)}
      onFocus={() => onActivate(n)}
      onBlur={() => onActivate(null)}
      aria-label={`Source ${n}`}
      className={cn(
        "relative -top-[0.35em] mx-px inline-block rounded-sm px-[0.2em] align-baseline",
        "font-mono text-[0.68em] leading-none font-semibold transition-colors",
        active ? "bg-ai text-ai-foreground" : "text-ai/70 hover:text-ai",
      )}
    >
      {n}
    </button>
  );
}

/**
 * Walks the string children markdown hands back and swaps [n] for a chip.
 * Only strings and arrays are touched — a rendered element's children have
 * already been through this, so recursing into them would double-wrap.
 */
function linkCitations(
  node: ReactNode,
  active: number | null,
  onActivate: (n: number | null) => void,
): ReactNode {
  if (Array.isArray(node)) {
    return node.map((child, i) => (
      <Fragment key={i}>{linkCitations(child, active, onActivate)}</Fragment>
    ));
  }
  if (typeof node !== "string" || !node.includes("[")) return node;

  const out: ReactNode[] = [];
  let cursor = 0;

  for (const match of node.matchAll(CITATION)) {
    const at = match.index ?? 0;
    if (at > cursor) out.push(node.slice(cursor, at));
    const n = Number(match[1]);
    out.push(
      <Cite
        key={`${at}-${n}`}
        n={n}
        active={active === n}
        onActivate={onActivate}
      />,
    );
    cursor = at + match[0].length;
  }

  if (!out.length) return node;
  if (cursor < node.length) out.push(node.slice(cursor));
  return out;
}

export function Answer({
  markdown,
  activeCitation,
  onCitation,
}: {
  markdown: string;
  activeCitation: number | null;
  onCitation: (n: number | null) => void;
}) {
  const cite = (children: ReactNode) =>
    linkCitations(children, activeCitation, onCitation);

  const components: Components = {
    p: ({ children }) => (
      <p className="mb-3 leading-relaxed last:mb-0">{cite(children)}</p>
    ),
    strong: ({ children }) => (
      <strong className="text-foreground font-semibold">
        {cite(children)}
      </strong>
    ),
    em: ({ children }) => <em className="italic">{cite(children)}</em>,

    ul: ({ children }) => (
      <ul className="marker:text-muted-foreground my-3 list-disc space-y-1.5 pl-5 first:mt-0 last:mb-0 [&_ul]:my-1.5 [&_ul]:list-[circle]">
        {children}
      </ul>
    ),
    ol: ({ children }) => (
      <ol className="marker:text-muted-foreground my-3 list-decimal space-y-1.5 pl-5 first:mt-0 last:mb-0">
        {children}
      </ol>
    ),
    li: ({ children }) => (
      <li className="pl-0.5 leading-relaxed">{cite(children)}</li>
    ),

    h1: ({ children }) => (
      <h4 className="mt-4 mb-1.5 text-sm font-semibold first:mt-0">
        {cite(children)}
      </h4>
    ),
    h2: ({ children }) => (
      <h4 className="mt-4 mb-1.5 text-sm font-semibold first:mt-0">
        {cite(children)}
      </h4>
    ),
    h3: ({ children }) => (
      <h5 className="text-muted-foreground mt-3 mb-1 text-xs font-semibold tracking-wide uppercase first:mt-0">
        {cite(children)}
      </h5>
    ),

    // An app route and a citation URL are not the same kind of link. Sending
    // an internal one through `target="_blank"` would open a second tab and
    // drop the SPA navigation, so those route through next/link instead.
    a: ({ href, children }) => {
      const className = "text-ai underline underline-offset-2";
      return href?.startsWith("/") ? (
        <Link href={href} className={className}>
          {children}
        </Link>
      ) : (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className={className}
        >
          {children}
        </a>
      );
    },
    code: ({ children }) => (
      <code className="bg-background/70 rounded border px-1 py-0.5 font-mono text-[0.85em]">
        {children}
      </code>
    ),
    pre: ({ children }) => (
      <pre className="bg-background/70 my-3 overflow-x-auto rounded-md border p-3 text-xs">
        {children}
      </pre>
    ),
    blockquote: ({ children }) => (
      <blockquote className="border-ai/40 text-muted-foreground my-3 border-l-2 pl-3 italic">
        {children}
      </blockquote>
    ),
    hr: () => <hr className="border-ai/20 my-4" />,

    table: ({ children }) => (
      <div className="my-3 overflow-x-auto">
        <table className="w-full border-collapse text-xs">{children}</table>
      </div>
    ),
    th: ({ children }) => (
      <th className="border-b px-2 py-1.5 text-left font-medium">{children}</th>
    ),
    td: ({ children }) => (
      <td className="border-b px-2 py-1.5 align-top">{cite(children)}</td>
    ),
  };

  return (
    <div className="text-sm">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
