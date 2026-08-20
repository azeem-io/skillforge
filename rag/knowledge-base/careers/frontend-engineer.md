---
title: Frontend Engineer
type: career
skills: [html, css, javascript, typescript, react, state-management, nextjs, responsive-design, web-accessibility, git]
---

# Frontend Engineer

A frontend engineer owns what the user actually touches. The work is judged on
how the interface behaves on a slow connection, a small screen, and a keyboard —
not on how it looks in a screenshot on a fast laptop.

## What the work actually looks like

Far more time goes into states than into layout. The happy path is quick; the
loading, empty, error, and partial states are where the work lives. A product
feels cheap almost entirely because those were skipped.

The second theme is managing change over time. State management is the recurring
hard problem: which component owns a piece of data, when it re-renders, and how
to avoid the tangle where changing one thing breaks something three screens
away.

## Skills that matter, roughly in order

**HTML.** Semantics, not tags. Using the right element gives you keyboard
behaviour and screen reader support for free; using a `div` for everything means
rebuilding all of it by hand, badly.

**CSS.** Flexbox, grid, the cascade, and specificity. Layout is no longer the
hard part it once was; the hard part is building something that holds up at
every width.

**JavaScript.** The language itself before any framework. Closures, the event
loop, promises, and `async`/`await`. Framework confusion is nearly always
JavaScript confusion wearing a costume.

**Responsive design.** Not three fixed breakpoints — designs that work at any
width. Container queries changed this significantly.

**Accessibility.** Visible focus, labelled controls, semantic landmarks, colour
contrast. Legally required in many contexts, and the fastest way to raise
baseline quality.

**React.** Components, props, state, effects. The mental model — UI as a
function of state — matters more than the API surface.

**TypeScript.** Catches an entire class of bug before runtime and makes
refactoring survivable. Learn JavaScript first; types on top of a shaky
foundation are just noise.

**Next.js.** Routing, server components, data loading. Worth learning after
React, not instead of it.

## Common ordering mistakes

Starting with React before JavaScript. The single most common path, and it
produces engineers who can assemble components but cannot debug them.

Treating accessibility as a final polish pass. Retrofitting it is
disproportionately expensive; building semantically from the start is nearly
free.

Learning a state management library before feeling the problem it solves. The
library only makes sense once you have hit the tangle yourself.

## Realistic timeline

From nothing to job-ready is typically 8–12 months part-time. Frontend has the
fastest feedback loop of any specialism — you see the result immediately — which
makes it a good entry point, and also makes it easy to plateau at "it works on
my machine".
