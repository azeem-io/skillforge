---
title: DevOps Engineer
type: career
skills: [linux-commands, shell-scripting, docker, dockerfile, kubernetes, cicd, terraform, monitoring-logging, cloud-fundamentals, secrets-management]
---

# DevOps Engineer

A DevOps engineer's goal is to make deploys boring and failures visible. Success
looks like nothing happening: releases that nobody notices, and incidents that
are detected before a user reports them.

## What the work actually looks like

Most of it is automation of things that were previously done by hand, plus the
observability to know whether the automation worked. The other half is being the
person who understands how the pieces actually fit together when something
breaks at an inconvenient hour.

## Skills that matter, roughly in order

**Linux.** The foundation under everything else. Filesystem, permissions,
processes, networking basics. Containers are a Linux feature; without Linux
fluency, Docker is memorised incantations.

**Shell scripting.** Idempotency is the key idea — a script that is safe to run
twice is a tool, one that is not is a liability.

**Docker.** Images versus containers, layers, volumes, networking. The most
common misunderstanding is treating a container as a small virtual machine.

**Dockerfile authoring.** Multi-stage builds, minimal base images, non-root
users, and layer caching that actually works. A 2GB image where 200MB would do
is a slow deploy on every single release.

**Container networking.** How containers reach each other and the outside world.
Necessary before Kubernetes will make any sense.

**Kubernetes.** Deployments, Services, ConfigMaps. Learn the primitives before
the ecosystem — most Kubernetes confusion is not knowing what a Service actually
does.

**CI/CD.** A pipeline that blocks a bad merge. It must fail fast and loudly; a
slow pipeline gets bypassed, and a flaky one gets ignored.

**Infrastructure as Code and Terraform.** Infrastructure reproducible from a
commit hash. State management is the part that surprises people.

**Monitoring and logging.** Structured logs and alerts that correspond to
something a human would act on. An alert nobody acts on is worse than no alert,
because it teaches the team to ignore alerts.

**Secrets management.** Never in the repository. Deleting the commit is not
enough — the secret must be rotated.

## Common ordering mistakes

Kubernetes before Docker, and Docker before Linux. Each layer assumes the one
below it, and skipping produces someone who can copy manifests but cannot debug
a pod that will not start.

Building elaborate pipelines before the application has tests. CI that runs
nothing meaningful is theatre.

## Realistic timeline

From basic command line to job-ready is typically 10–16 months part-time. DevOps
rewards breadth, which makes it slower to reach a hireable baseline but harder to
automate away.
