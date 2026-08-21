---
name: ui-component
description: Use when building or changing any UI in frontend/ — pages, components, graph views. Covers the token system, the mastery colour language, and the rules that keep the app looking like one product.
---

# Building UI

Tailwind v4 only. **No CSS Modules** — if you are porting logic from Retention
Lab, the `.module.css` file is discarded and rebuilt as Tailwind classes.

## Tokens

`frontend/app/globals.css` is the only place a colour is defined. Two layers:
raw semantic variables, then a bridge into Tailwind's `--color-*` namespace via
`@theme inline`. Never write a hex value in a component. If a value is missing,
add the token to Layer 1 and the bridge to Layer 2.

Use `bg-muted`, `text-foreground`, `border-border`, `ring-ring` — not
`bg-gray-100`.

## The mastery colour language

Four states, used identically in the Skill Graph, Skill Tree and Roadmap. A
student learns the language once.

| State | Meaning | Token prefix |
|---|---|---|
| mastered | at or above the level the goal requires | `mastery-mastered-*` |
| progress | some evidence, below required level | `mastery-progress-*` |
| gap | required, no evidence yet | `mastery-gap-*` |
| locked | a gap whose own prerequisites are unmet | `mastery-locked-*` |

Each has `-bg`, `-fg` and `-ring`. `gap` is the loudest on purpose — it is the
only state the student can act on.

## AI provenance

`--ai` / `bg-ai`, `text-ai`, `border-ai` is reserved for model-generated
content: the expand wand, suggestion borders, agent messages, generated
narration. Used nowhere else, so gold always reads as "a model made this,
review it". Do not use it for ordinary emphasis.

## Accessibility floor

- Visible keyboard focus. `:focus-visible` is styled globally; do not remove it.
- Labelled form controls, semantic landmarks.
- `prefers-reduced-motion` is respected globally. Any new animation must not
  fight that block.
- Body text contrast checked against WCAG AA.

## Server and client

Server Components by default. `"use client"` only on the smallest component
that needs interaction — the graph views need it, a stat card does not.

## Graph views

Skill Graph and Roadmap are one React Flow component with a `mode` prop, not
two components. Skill Tree is separate — d3 circle packing over the same data
read as a tree.

Layout is dagre, not ELK. The graph is ~120 nodes; ELK's tuning only matters in
the thousands.
