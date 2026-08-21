---
title: Machine learning skills
type: skill
skills: [logistic-regression, decision-trees, random-forest, feature-engineering, scikit-learn, deep-learning, pytorch, cnn, nlp, transformers, llms, prompt-engineering, rag, model-deployment, mlops]
---

# Machine learning skills

Model families past the fundamentals, and the layer of practice — deployment,
monitoring, prompting — that turns a trained model into something a product
can rely on.

## Logistic regression

Despite the name, a classification algorithm, not a regression one — it
outputs a probability and a threshold turns that into a class. The simplest
model that should usually be tried before anything more complex; if a linear
decision boundary through the feature space can't separate the classes,
that's useful information about the problem, not just about the model.

## Decision trees

Splits the feature space with a sequence of thresholds, one feature at a
time. Easy to explain to a non-technical stakeholder because the reasoning is
literally a flowchart — the trade is that a single deep tree overfits easily,
memorizing the training data's noise along with its signal.

## Random forest

An ensemble of many decision trees, each trained on a random subset of the
data and features, with their votes averaged. The randomness is the point:
individually noisy trees average out to something more stable than any one of
them, which is why the ensemble usually beats a single deep tree on unseen
data.

## Feature engineering

Transforming raw data into inputs that make the pattern easier for a model to
find — often the highest-leverage step on tabular problems, and the one most
often skipped in favour of reaching for a bigger model instead. A well-chosen
feature can make a simple model outperform a complex one trained on raw
columns.

## Scikit-learn

A consistent `fit`/`predict` interface across classical ML models in Python —
swap logistic regression for a random forest by changing one line, because
they share the same API. Its cross-validation and pipeline utilities are
usually more valuable day to day than the models themselves.

## Deep learning

Neural networks with enough layers that they learn their own feature
representations rather than needing them hand-engineered. It depends on
gradient descent and regularization working correctly first — starting here
before training simpler models is a common ordering mistake, because the
concepts that explain why a deep network fails to converge only make sense
once you've watched a simpler model fail for an understandable reason.

## PyTorch

The standard library for defining and training neural networks with a
dynamic computation graph — the graph is built as the code runs, which makes
debugging closer to debugging ordinary Python than debugging a fixed,
pre-compiled graph. Learn what a gradient is before reaching for it; the API
is straightforward once that's solid and bewildering if it isn't.

## Convolutional neural networks

Slide a small learned kernel across the input to detect local patterns —
edges, textures, shapes — regardless of where in the image they appear. The
weight sharing across positions is what makes them dramatically more
parameter-efficient than a fully-connected network for grid-shaped data like
images.

## Natural language processing

Tokenization — splitting text into units a model can consume — is the first
step under almost everything else in NLP. Before transformers, this field was
mostly hand-built features and separate models per task; the shift to
pretrained language models changed what a "task" even means, from
architecture design to prompting or fine-tuning a shared base.

## Transformer architectures

Self-attention lets every token in a sequence weigh every other token
directly, rather than passing information step by step like a recurrent
network does. That's what let transformers scale on modern hardware where
recurrence couldn't — attention parallelizes across the sequence; recurrence
can't.

## Large language models

Transformers trained on enough text to do far more than the task they were
trained on — a side effect of scale, not a separate design choice. What
they're good at and where they confidently fail is uneven, which is why
grounding claims in retrieved sources rather than trusting recall alone
matters for anything where being wrong is costly.

## Prompt engineering

Adapting a pretrained model's behaviour by writing an effective instruction,
with no weights updated. Specificity beats cleverness: telling the model
exactly what shape of answer you want, and giving it the facts it needs
rather than trusting it to recall them, outperforms elaborate phrasing tricks
almost every time.

## Retrieval-augmented generation

Retrieve relevant documents first, then generate an answer with them added to
the prompt as context — grounding the model in real, current, citable text
instead of only what it memorized during training. The retrieval quality
bounds the answer quality: perfect generation over irrelevant retrieved
context still produces a wrong answer.

## Model deployment

Wrapping a trained model behind an API that serves predictions on new input,
with input validation and a health check — the point where an AI engineer's
job diverges from a data scientist's. A model file sitting in a notebook has
provided zero value to anyone using the product yet.

## MLOps

The practices for reliably deploying, monitoring and retraining models in
production — versioning models alongside the data they were trained on,
watching for drift as the real world stops matching the training
distribution, and retraining on a schedule rather than once and forgetting
it. The difference between a demo that worked once and a system that keeps
working.
