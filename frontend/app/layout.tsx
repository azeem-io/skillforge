import type { Metadata } from "next";
import localFont from "next/font/local";

import { TooltipProvider } from "@/components/ui/tooltip";
import { THEME_SCRIPT } from "@/lib/theme";

import "./globals.css";

// Vendored, not fetched. next/font/google resolves at build time, and the
// build runs inside a container with no route to fonts.googleapis.com.
// These are the upstream variable fonts subset to latin, latin-ext and the
// arrows and box glyphs the graph views draw with.

const geist = localFont({
  src: "./fonts/Geist-Variable.woff2",
  variable: "--font-geist",
  weight: "100 900",
  display: "swap",
  fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
});

const spaceGrotesk = localFont({
  src: "./fonts/SpaceGrotesk-Variable.woff2",
  variable: "--font-space-grotesk",
  weight: "300 700",
  display: "swap",
  fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
});

const geistMono = localFont({
  src: "./fonts/GeistMono-Variable.woff2",
  variable: "--font-geist-mono",
  weight: "100 900",
  display: "swap",
  fallback: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
});

export const metadata: Metadata = {
  title: "SkillForge",
  description:
    "Evaluate your skills, find the gaps, and get a roadmap to the role you want.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      // The pre-paint script below sets `class` and `style` on this element,
      // so the server's markup and the client's first read never match here.
      suppressHydrationWarning
      className={`${geist.variable} ${spaceGrotesk.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script
          // Must run before the browser paints, which rules out next/script
          // and any component. It only reads localStorage and sets a class.
          dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }}
        />
      </head>
      <body className="flex min-h-full flex-col">
        <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
      </body>
    </html>
  );
}
