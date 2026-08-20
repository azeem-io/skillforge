---
title: Choosing projects that prove a skill
type: project
---

# Choosing projects that prove a skill

A project's value is what it forces you to confront, not what it looks like when
finished. A polished todo app proves less than an ugly thing that made you solve
a real problem.

## What makes a project worth building

**It has a failure mode you have to handle.** Fetching an API teaches little;
fetching an API that is sometimes slow, sometimes down, and occasionally returns
malformed data teaches the actual job.

**It is small enough to finish.** An abandoned ambitious project teaches less
than a completed modest one, because the hard parts are usually at the end —
edge cases, deployment, the states nobody thought about.

**You cannot copy it wholesale.** If a tutorial exists for exactly your project,
change the requirements until one does not.

## Projects by what they force

**Data cleaning on a real messy dataset** — forces judgement calls with no
correct answer, which is most of data work. Document every decision you make.

**A model you then try to break** — build a classifier that scores well, then
find the data split where it fails. Teaches evaluation design better than any
amount of reading.

**A two-layer neural network in NumPy** — forward pass, backward pass, gradient
descent, no framework. Makes PyTorch obvious afterwards.

**An API with pagination and honest errors** — the pagination and the status
codes are the lesson, not the CRUD.

**Containerising something you already wrote** — multi-stage build, non-root
user, image under 200MB. The constraints are the exercise.

**Deploying to a cluster and then deleting a pod** — watching it come back
teaches what a Deployment actually is.

**Removing a secret from git history** — including rotating it. Teaches that
deleting the commit is not sufficient.

**Rebuilding a layout at three widths with no framework** — grid, flexbox,
container queries. Teaches CSS in a way component libraries prevent.

## How to know a project is done

Not when it works on your machine. When someone else can run it from the README
without asking you a question. That last stretch — the setup instructions, the
environment variables, the seed data — is where a surprising share of real
engineering lives.
