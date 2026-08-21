---
title: Database skills
type: skill
skills: [database-queries, database-design, database-normalization, indexing, query-optimization, transactions, postgresql, database-migrations, orm, nosql, mongodb, redis, connection-pooling, vector-databases]
---

# Database skills

Modelling data before querying it, querying it well, and the operational habits
that keep a schema trustworthy once real traffic hits it.

## Database queries

`SELECT`, `WHERE`, `ORDER BY`, `LIMIT` — the read side, and where most people's
SQL actually lives day to day. `WHERE` filters rows before any grouping
happens; a filter that needs to run after an aggregate belongs in `HAVING`
instead, and mixing the two up is a common source of "why does this return
nothing."

## Database design

Deciding what a table represents before deciding what columns it has. A
foreign key is a promise that a row in one table refers to a real row in
another — the database can enforce that promise, which is worth more than it
sounds until the day application code tries not to. A many-to-many
relationship needs a join table holding a foreign key to each side; there is
no way to model it with a single shared key.

## Database normalization

Removing transitive dependencies so a fact lives in exactly one place. The
payoff is an update that can't go half-right: change a customer's address once
instead of finding every row that copied it. Denormalizing is sometimes the
right call for read performance — the mistake is doing it by accident rather
than as a deliberate, documented trade.

## Indexing

Read performance in exchange for write performance and storage — every index
has to be maintained on every insert and update, not just consulted on reads.
The gap between a 5ms query and a 5s query is usually one missing index on the
column a `WHERE` or `JOIN` filters by. An index that's never used by a query
plan is pure cost with no benefit.

## Query optimization

Start from `EXPLAIN`, not from guessing. The execution plan says whether a
query is scanning the whole table or using an index, and that's the
difference that actually explains slowness — adding hardware to a query
scanning every row just makes the scan faster, not correct.

## Transactions

A group of operations that succeed or fail together — the "A" in ACID. This is
what stops two users from both successfully claiming the last seat: without a
transaction wrapping the check and the claim, there's a window where both
reads happen before either write lands.

## PostgreSQL

A relational database that also does more than relational: JSON columns,
full-text search, and via the `pgvector` extension, a vector type with
nearest-neighbour indexes for embeddings — enough to run a small retrieval
system without a separate vector database. Its `EXPLAIN ANALYZE` is the
first tool to reach for when a query optimization question comes up.

## Database migrations

Schema changes as ordered, version-controlled files instead of manual
`ALTER TABLE` statements someone runs once and forgets. Checked into git for
the same reason application code is: reproducible, reviewable, and undoable.
An environment that can't be rebuilt from migrations plus a fresh database is
one bad afternoon away from being the only copy of the schema that exists.

## Object-relational mapping

Maps rows in a table to objects in application code, so most days you write
almost no raw SQL. The trap is trusting the ORM completely — it generates
SQL, and when that SQL is slow or wrong, you need to be able to read what it
produced. Learning an ORM before SQL tends to produce someone who can't debug
their own ORM.

## NoSQL

A family of databases built around a different trade-off than "everything is
a table with a fixed schema and joins." Good fit when records vary in shape
and don't need cross-record joins; a bad fit for data that's inherently
relational just because it sounds more modern. The decision is about the
shape of the data, not about scale.

## MongoDB

A document-oriented NoSQL database storing records as BSON documents rather
than rows. Schema flexibility is the pitch — different documents in the same
collection can have different fields — which is a feature for evolving data
and a liability for data that actually needs consistent structure enforced.

## Redis

An in-memory key-value store, most often used as a cache or for anything that
needs to be fast and doesn't need to survive a restart at all costs. Session
storage, rate limiting, and caching an expensive query's result are the
classic uses — none of them want the durability guarantees a relational
database provides, and paying for those guarantees anyway would just be
slower.

## Connection pooling

Opening a database connection is expensive relative to running a query on one
— a pool keeps a set of connections open and hands them out, instead of
paying that cost on every request. Under load, a service without pooling
spends more time establishing connections than doing useful work.

## Vector databases

Indexes embeddings for nearest-neighbour search — "what's semantically similar
to this" rather than "what matches this exact value." This is the retrieval
half of RAG: a question gets embedded, the nearest chunks come back, and
those chunks become the context a model answers from. At small corpus sizes a
linear scan over embeddings is often faster than standing up dedicated
infrastructure; the index only starts earning its keep once the corpus
outgrows memory.
