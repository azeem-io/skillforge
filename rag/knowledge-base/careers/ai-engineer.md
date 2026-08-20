---
title: AI Engineer
type: career
skills: [python, numpy, pandas, supervised-learning, model-evaluation, scikit-learn, model-deployment, mlops, docker, sql]
---

# AI Engineer

An AI engineer sits between data science and backend engineering. The job is not
inventing new architectures — that is research. The job is taking a model from a
notebook to something that serves real traffic and does not quietly degrade.

## What the work actually looks like

Most of the time goes to data, not models. Cleaning it, understanding why a
column is null 40% of the time, building the pipeline that keeps it flowing.
Model selection is usually a short conversation; a gradient-boosted tree on good
features beats a neural network on bad ones far more often than newcomers
expect.

The second largest slice is evaluation. Knowing whether a model works is harder
than training one. A model that scores 94% on a test split and fails in
production almost always failed at evaluation design, not at training.

## Skills that matter, roughly in order

**Python.** Not "can write a script" — comfortable with classes, error handling,
virtual environments and packaging. You will read more code than you write.

**NumPy and Pandas.** The working surface for anything tabular. Vectorised
thinking matters: a loop over a DataFrame is a sign you have not learned the
tool yet.

**Statistics.** Descriptive statistics, probability, and hypothesis testing.
Without these you cannot tell a real improvement from noise, which makes every
evaluation you run meaningless.

**Supervised learning.** Regression and classification, and the discipline
around them: train/validation/test splits, cross-validation, and what
overfitting actually looks like in a learning curve.

**Feature engineering.** Consistently the highest-leverage skill on tabular
problems, and the one most often skipped in favour of trying a bigger model.

**Model evaluation.** Precision, recall, ROC-AUC, and — more importantly —
knowing which one your problem cares about. Accuracy on an imbalanced dataset is
a trap.

**Deployment.** A model behind an API, in a container, with input validation and
a health check. This is where AI engineers diverge from data scientists.

**MLOps.** Versioning models alongside data, monitoring for drift, retraining on
a schedule. The difference between a demo and a system.

## Common ordering mistakes

Starting with deep learning. Neural networks are further along the path than
they appear, because they depend on gradient descent, regularisation, and
evaluation discipline that only make sense once you have trained simpler models
and watched them fail.

Skipping SQL. Most real data lives in a database. An AI engineer who cannot
write a join is dependent on someone else for every dataset.

Learning frameworks before fundamentals. PyTorch is easy once you understand
what a gradient is. It is bewildering if you do not.

## Realistic timeline

From comfortable-with-Python to job-ready is typically 9–15 months of consistent
part-time study. The stretch that takes longest is usually statistics through
supervised learning, because it is conceptual rather than mechanical and cannot
be rushed by building more projects.
