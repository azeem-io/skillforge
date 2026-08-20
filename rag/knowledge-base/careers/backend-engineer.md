---
title: Backend Engineer
type: career
skills: [python, sql, database-design, relational-modelling, indexing, rest-api, authentication, authorization, docker, git]
---

# Backend Engineer

A backend engineer owns the data and the contracts over it. The work is judged
on whether the data model survives contact with reality and whether the API is
still correct when two people hit it at the same time.

## What the work actually looks like

The data model is the decision with the longest shadow. A bad schema is felt
every day for years; a bad function is rewritten in an afternoon. Time spent on
relational modelling before writing endpoints pays back repeatedly.

Beyond that, the recurring work is correctness under conditions the happy path
never sees: concurrent writes, partial failures, retries, and inputs nobody
anticipated.

## Skills that matter, roughly in order

**SQL.** Not just `SELECT` — joins, aggregation, subqueries, and reading a query
plan. Backend engineers who cannot read `EXPLAIN` cannot diagnose the most common
class of production slowness.

**Relational modelling and normalisation.** Understanding why a fact should live
in exactly one place, and when denormalising is a deliberate trade rather than a
mistake.

**Indexing and query optimisation.** The gap between a 5ms query and a 5s query
is usually one index. Knowing which one is the skill.

**Transactions.** Atomicity and isolation levels. This is what stands between
you and two users successfully claiming the same thing.

**HTTP fundamentals.** Methods, status codes, headers, caching. REST design is
mostly just using HTTP the way it was intended.

**REST API development.** Validation at the boundary, honest status codes,
pagination, and versioning. Reachable from any language — the concepts do not
belong to Express or FastAPI.

**Authentication and authorization.** Two different problems. Authentication is
who you are; authorization is what you may do. Conflating them is a common and
expensive bug.

**Password hashing.** Argon2id or bcrypt, never a general-purpose hash like
SHA-256. Password storage is one of the few areas where the correct answer is
settled and widely documented.

## Common ordering mistakes

Writing endpoints before modelling the data. Almost always leads to a schema
shaped by the first three screens rather than by the domain.

Learning an ORM before SQL. The ORM generates SQL; when it generates something
slow or wrong, you need to be able to read it.

Treating authorization as a middleware concern only. Middleware checks have been
bypassable; the durable pattern is re-verifying at the data layer.

## Realistic timeline

From basic programming to job-ready is typically 9–14 months part-time. The
database half of the skill set is where most of the depth is, and it is the part
most commonly under-invested in.
