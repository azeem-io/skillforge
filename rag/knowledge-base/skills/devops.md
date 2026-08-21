---
title: DevOps skills
type: skill
skills: [shell-scripting, process-management, container-networking, cicd, terraform, monitoring-logging, deployment-strategies, reverse-proxy]
---

# DevOps skills

Everything between a merged branch and that code serving real traffic, and how
to find out fast when it stops.

## Shell scripting

Automating what would otherwise be typed by hand, repeatedly, at 2am.
Idempotency is the idea that separates a script from a liability: one that's
safe to run twice — because it checks state before acting rather than assuming
a clean slate — is a tool; one that isn't is a landmine for whoever runs it
next.

## Process management

Understanding what's actually running on a machine: listing processes,
reading their state, and knowing which signal does what. `SIGTERM` asks a
process to shut down cleanly and gives it a chance to; `SIGKILL` (`kill -9`)
ends it immediately with no cleanup and cannot be caught or ignored. Reaching
for `-9` first is how a process gets killed mid-write.

## Container networking

How containers reach each other and the outside world. On a Docker Compose
network, containers resolve each other by service name through Compose's
built-in DNS — not by hardcoded IPs, which change every time a container
restarts. Necessary to actually understand before Kubernetes will make any
sense, because Kubernetes networking is this same problem at a larger scale.

## CI/CD pipelines

A pipeline that blocks a bad merge before it reaches anyone else, and — for
continuous deployment specifically — ships it automatically once it passes.
It has to fail fast and loudly: a slow pipeline gets bypassed under deadline
pressure, and a flaky one gets ignored, which quietly turns a safety net into
theatre.

## Terraform

Infrastructure as code for provisioning cloud resources, not just configuring
servers that already exist. `terraform plan` shows what would change before
anything actually changes — the equivalent of a dry run — and is the command
to reach for before `apply` on anything touching production. State management
is the part that surprises newcomers: Terraform has to track what it already
created somewhere, and losing that state file is losing the map.

## Monitoring and logging

Structured logs and alerts tied to a condition a human would actually act on.
A service failing silently in production with no alert is a monitoring gap,
not bad luck — the failure happened whether or not anything watched for it.
An alert nobody acts on is worse than no alert at all, because it trains the
team to start ignoring alerts generally.

## Deployment strategies

How a new version reaches production without an all-at-once cutover. A
blue-green deployment runs the old and new versions side by side and switches
traffic at once, which makes rollback instant — the old version is still
running. A canary deployment routes a small slice of traffic to the new
version first and watches for errors before finishing the rollout, trading
rollback speed for catching a bad deploy before it reaches everyone.

## Reverse proxies

Accepts client requests and forwards them to the right backend server — the
layer in front that terminates TLS, routes by path or host, and can load
balance across replicas. It's the piece that lets several services share one
public entry point without the client needing to know any of them exist
individually.
