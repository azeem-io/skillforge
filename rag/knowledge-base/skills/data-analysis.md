---
title: Data analysis skills
type: skill
skills: [numpy, pandas, jupyter, data-cleaning, exploratory-analysis, descriptive-statistics, probability, hypothesis-testing, data-visualization, matplotlib, sql-for-analytics, time-series-analysis, dashboarding]
---

# Data analysis skills

Getting from raw, messy data to a claim someone else can trust and act on.

## NumPy

Fast n-dimensional array operations, and the foundation everything else in
the Python data stack sits on. Vectorised thinking is the skill that actually
matters: expressing an operation as array math instead of a Python loop is
routinely 10-100x faster, because the loop moves into optimized C instead of
running in the interpreter.

## Pandas

DataFrames — labeled, tabular data with the vectorised speed of NumPy
underneath. A `for` loop over rows of a DataFrame is close to always a sign
the vectorised equivalent hasn't been found yet; almost everything expressible
as a loop has a faster, more idiomatic pandas expression.

## Jupyter notebooks

Runnable code cells interleaved with markdown documentation, one cell at a
time — built for exploration, where the next step depends on what the last
one showed. The trade for that flexibility is state that's easy to lose track
of: a notebook run out of order can produce results that don't reproduce from
a clean restart, which is why "restart and run all" before trusting a result
is a real habit, not paranoia.

## Data cleaning

`dropna` removes rows with missing values; `fillna` keeps the row and
substitutes a value instead — picking between them is a judgement call about
whether a missing value means "unknown" or "not applicable," and those imply
different fixes. Most of the actual time in a data analysis project goes here,
not into modelling.

## Exploratory data analysis

Understanding a dataset's structure, distributions and anomalies before doing
anything else with it — not the fast path to an answer, but the step that
catches the mistake that would otherwise silently poison every result built
on top of it. Skipping straight to modelling on data you haven't looked at is
how a data-entry error becomes a headline finding.

## Descriptive statistics

Mean, median, mode, and how differently they behave under outliers. The
median only depends on the middle position, so a handful of extreme values
can't drag it the way they drag the mean — reporting a mean income without
checking the distribution is a classic way to describe a number nobody
actually has.

## Probability

Two events are independent if one occurring doesn't change the probability of
the other — a condition that's assumed constantly and violated more often
than intuition suggests. Most statistical tests have an independence
assumption buried in them somewhere, and violating it quietly is one of the
most common ways an analysis's confidence turns out to be unearned.

## Hypothesis testing

A p-value below the significance threshold means: reject the null hypothesis.
It does not mean the effect is large, or that it matters practically — a huge
sample size can make a trivially small, meaningless difference statistically
significant. Statistical significance and practical significance are
different questions, and conflating them is the single most common
misreading of a test result.

## Data visualization

The chart type is a claim about what the reader should compare. A bar chart
makes precise comparison across more than a couple of categories easy in a
way a pie chart doesn't; an axis that doesn't start at zero exaggerates a
difference whether or not that was the intent. The chart is part of the
argument, not decoration after it.

## Matplotlib

The low-level plotting library most of the Python visualization ecosystem
builds on. `plt.subplots()` creates a figure and a grid of axes in one call,
which is the starting point for almost any real plot — the figure/axes split
is the mental model worth internalizing before anything else about the API.

## SQL for analytics

`GROUP BY` collapses rows sharing a value so an aggregate — count, sum,
average — can be computed per group, and `HAVING` filters those grouped
results the way `WHERE` filters rows before grouping. Most analytical
questions ("average order value by month," "top customers by spend") are
this pattern with the specifics changed.

## Time series analysis

Trend is the long-run direction; seasonality is the part that repeats on a
fixed calendar interval — daily, weekly, yearly. Mistaking a seasonal dip for
a trend is a common misread: a December sales drop that happens every year
isn't decline, it's the calendar, and treating it as decline leads to the
wrong response.

## Dashboarding

A query layer plus visualization, refreshed on a schedule or trigger rather
than exported once as a static image. The hard part usually isn't the chart —
it's the query underneath staying correct and fast as the underlying data and
its volume grow, which is exactly where SQL for analytics and indexing
knowledge stop being optional.
