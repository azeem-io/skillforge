---
title: Cloud and security skills
type: skill
skills: [cloud-fundamentals, object-storage, serverless, virtual-networks, iam, environment-configuration, secrets-management, https-tls, data-encryption, password-hashing, authentication, authorization, owasp-top-ten, application-security, sql-injection]
---

# Cloud and security skills

Where a deployed service and its data actually live, the boundary around them,
and closing the gaps attackers look for first.

## Cloud computing fundamentals

Elasticity — capacity scaling up or down automatically with demand — is the
core promise that distinguishes cloud infrastructure from a fixed server: pay
for what's used, not for peak capacity sitting idle the rest of the time.
Nearly everything else in cloud computing is a variation on renting compute,
storage or networking by the hour instead of buying it.

## Object storage

Built for large, unstructured files — images, backups, logs — not for
low-latency queries. The access pattern is the tell: reaching for object
storage to run relational queries against, or a database to store video
files, both mean the wrong tool got picked for the job.

## Serverless architecture

Compute provisioned only while a function is actually running, not
continuously — the platform handles scaling and idle cost disappears. The
trade is cold starts: the extra latency when a new instance has to
initialize before it can handle a request, which matters for latency-sensitive
paths and doesn't for background jobs.

## Virtual networks

An isolated network boundary for cloud resources — what keeps a database
unreachable from the public internet even though it runs on the same cloud
provider as things that are. Getting this boundary wrong is one of the most
common ways a resource that was never meant to be public ends up exposed.

## Identity and access management

Controls which identities can perform which actions on which resources. The
principle of least privilege — granting only what's actually needed, not what
would be convenient — is the default that keeps a compromised credential's
blast radius small; a service account with far more access than its job
requires turns a small breach into a large one.

## Environment configuration

Configuration like API URLs and feature flags lives in environment variables,
kept separate from code and swappable per environment without a code change.
It's also the boundary that keeps a secret out of source control in the first
place — the variable is injected at runtime, not committed alongside the code
that reads it.

## Secrets management

A database password or API key comes from a secrets manager or an injected
environment variable — never committed in plaintext, never in a comment,
never in a shared spreadsheet. Deleting the commit that exposed a secret is
not sufficient once it's pushed; the secret has to be rotated, because it's
already been seen.

## HTTPS and TLS

Encrypts a connection so anyone on the network path between client and
server can't read it — port 443 by default. A login form submitted over
plain HTTP exposes the password to anyone on that path, hashing on the
server notwithstanding, because the exposure happens before the server ever
sees the request.

## Data encryption

Protects data while it sits on disk or in a backup — a distinct property from
encryption "in transit," which is what TLS provides while data moves over the
network. A system can have one without the other, and an attacker with disk
access cares about the first, not the second.

## Password hashing

A per-user salt stops a precomputed rainbow table from matching every user's
hash at once — the same password for two users no longer produces the same
stored hash. Argon2id and bcrypt are the current answer because they're
deliberately slow, resisting brute-force guessing in a way a fast
general-purpose hash like SHA-256 does not.

## Authentication

Answers "who is this?" — typically by issuing a session token stored
server-side and referenced by a cookie, so the client never has to resend a
password on every request. It is a different question from authorization,
and treating them as the same thing is a common and expensive class of bug.

## Authorization

Answers "what is this identity allowed to do?" — a server-side check that a
requested resource actually belongs to, or is permitted for, the caller. Being
logged in answers authentication, not this; a user editing a URL's id to
request someone else's private data is exactly the case this has to catch,
and a client-side check alone never will, because the client is not trusted.

## OWASP Top Ten

The industry-standard ranking of the most critical web application security
risks, revised periodically as real-world attack patterns shift. Broken
access control and injection attacks are perennial entries — not because
they're exotic, but because they're easy to introduce accidentally and easy
to miss in review without looking for them specifically.

## Application security

Practices that address the OWASP Top Ten class of risk directly: input
validation, output encoding, and re-verifying authorization at the data
layer rather than trusting a middleware check alone — a middleware check can
be bypassed if any code path skips it, while a check at the data layer
can't be, because it sits where the data actually leaves.

## SQL injection prevention

Parameterised queries, not escaping quotes by hand or hiding error messages —
the latter two change the symptom without touching the underlying flaw, which
is user input being concatenated directly into a query string instead of
passed as a separate parameter the database treats as data, never as code.
