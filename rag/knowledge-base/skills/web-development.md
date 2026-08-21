---
title: Web development skills
type: skill
skills: [javascript, async-javascript, dom-manipulation, typescript, react, state-management, nextjs, nodejs, express, http-fundamentals, rest-api, openapi, graphql, frontend-build-tooling, web-accessibility, responsive-design]
---

# Web development skills

Everything past HTML and CSS: the language, the runtime, the frameworks, and the
protocol they all talk over.

## JavaScript

The language every framework sits on top of. Closures, `this` binding, and
prototypal inheritance are the three places mental models from other languages
mislead people most. A bug that looks like a framework bug is JavaScript
confusion wearing a costume more often than it looks.

## Asynchronous JavaScript

Callbacks, then Promises, then `async`/`await` — three syntaxes for the same
event-loop model underneath. The event loop never blocks: `await` pauses a
function, not the runtime. Forgetting to `await` a Promise is the single most
common async bug, and it fails silently rather than loudly.

## DOM manipulation

Reading and writing the tree the browser renders from. `querySelector` and
friends are the primitives; a framework's job is mostly managing this so you
don't do it by hand at scale. Understanding it directly still matters — it's
what a framework compiles down to, and it's what you debug with when the
abstraction leaks.

## TypeScript

A type layer erased entirely before the code runs — it changes nothing at
runtime, only what the compiler will let you ship. Learn JavaScript first;
types bolted onto a shaky JavaScript foundation just relocate the confusion to
compile time instead of removing it. `unknown` over `any` is the habit that
actually pays off: `any` opts a value out of checking, `unknown` forces you to
narrow it before use.

## React

Components as a function of state, re-rendering when that state changes. The
model is simpler than the ecosystem around it suggests — most confusion is
about when a component re-renders and why, not about JSX syntax. Hooks have
rules (called at the top level, same order every render) because React tracks
state by call order, not by name.

## State management

The recurring hard problem once an app grows past a few components: which
component owns a piece of data, and how far it has to travel to reach
everything that needs it. "Lifting state up" to the nearest common ancestor
solves most cases before a dedicated library is justified. Reaching for a
state library before feeling the tangle it solves is a common ordering
mistake — the tool only makes sense in hindsight.

## Next.js

A framework over React that adds routing, data loading and rendering
strategy. Server Components render on the server and ship no client JavaScript
by default, which is a different default from the client-rendered-everything
model React alone implies. Worth learning after React fluency, not as a
substitute for it — its abstractions assume you already know what they're
hiding.

## Node.js

JavaScript outside the browser, on Google's V8 engine. The absence of a
browser matters: no DOM, no `window`, but a filesystem and network stack
instead. It's what makes "JavaScript on the backend too" possible, for better
(one language, two ends) and worse (the ecosystem's package sprawl follows
it there).

## Express.js

A minimal routing and middleware layer over Node's HTTP server. Middleware —
a function that runs on a request before the route handler — is the one idea
worth really understanding; nearly everything else in Express is composing
middleware. It stays out of the way rather than prescribing structure, which
is a feature until a codebase grows large enough to need one.

## HTTP fundamentals

Methods, status codes, headers, caching — the protocol underneath every web
API regardless of language or framework. A 404 means the resource doesn't
exist; a 401 means prove who you are; a 403 means no, whoever you are. Mixing
those three up in an API is a common and confusing bug for whoever calls it.

## REST API development

Applying HTTP the way it was designed rather than inventing a new convention
per endpoint. Validation at the boundary, honest status codes, and treating a
URL as a noun (a resource) with the verb carried by the HTTP method, not the
path. Not tied to any one server language — the concepts transfer whole.

## OpenAPI Specification

A machine-readable contract for an API's endpoints, parameters and response
shapes. Its value compounds: generated client types, generated docs, and
request validation all come from the same source of truth instead of three
hand-maintained copies that drift apart.

## GraphQL

Lets the client specify exactly the fields it needs in one request instead of
hitting several REST endpoints and discarding what it doesn't use. The trade
is server-side complexity — a naive resolver graph can turn one query into
many database calls (the N+1 problem) — for client-side flexibility.

## Frontend build tooling

The layer that turns a tree of source files into what a browser can actually
run: bundling, transpiling newer syntax down, and tree-shaking unused code
out. Invisible when it works, and the first thing to check when "it works
locally but not in the build" — those are usually different code paths, not
the same code behaving differently.

## Web accessibility

A text alternative for non-text content, a label on every control, visible
keyboard focus, and colour contrast that survives being colourblind. Nearly
free when built in from the start with semantic HTML; expensive to retrofit
once a hundred `div`s need to relearn what a `button` gave for free. Legally
required in many jurisdictions, which makes it a compliance question as much
as a craft one.

## Responsive design

Designing for a range of widths rather than a handful of fixed breakpoints.
Flexbox and grid removed most of the old hacks; container queries let a
component respond to the space it's actually given rather than the whole
viewport, which matters once the same component appears in a sidebar and a
full-width page.
