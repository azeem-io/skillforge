# Database schema

PostgreSQL 17 with pgvector. One database, one migration history in
`packages/db/migrations`, applied by the `migrate` container before any service
starts.

## The shape in one paragraph

`skills` is one table with an `altitude` enum (CATEGORY / SUBCATEGORY / SKILL).
Two structures sit over it: a **tree** via `parent_id` (the Skill Tree view) and
a **DAG** via `skill_prerequisites` (the Skill Graph). The **roadmap is not a
third structure** — it is the target role's required subgraph, minus what the
student has demonstrated, layered by topological sort. Three views, one table.

## Skills and roles

```mermaid
erDiagram
    skills ||--o{ skills : "parent_id (tree)"
    skills ||--o{ skill_prerequisites : "skill_id (DAG)"
    skills ||--o{ skill_prerequisites : "prerequisite_id"
    target_roles ||--o{ role_requirements : requires
    skills ||--o{ role_requirements : "is required by"
    skills ||--o{ resources : "has"

    skills {
        uuid id PK
        text slug UK
        text name
        enum altitude "CATEGORY|SUBCATEGORY|SKILL"
        uuid parent_id FK
        uuid category_id FK "denormalised root"
        boolean ai_generated
    }
    skill_prerequisites {
        uuid skill_id PK,FK
        uuid prerequisite_id PK,FK
        text strength "hard|soft"
    }
    target_roles {
        uuid id PK
        text slug UK
        text name
    }
    role_requirements {
        uuid role_id PK,FK
        uuid skill_id PK,FK
        smallint required_level "1-5"
        smallint weight "1-5"
    }
    resources {
        uuid id PK
        uuid skill_id FK
        enum type "course|article|video|book|project|documentation"
    }
```

Two invariants cannot be expressed in SQL and are enforced on write, with
`SkillGraph.validate()` in the Python service as the backstop:

- prerequisite edges connect leaves only (`altitude = 'SKILL'`)
- the prerequisite graph stays acyclic

The seed script checks both before it writes, with a depth-first cycle
detector — an undefined topological sort would silently produce a nonsense
roadmap.

`required_level` and `student_skills.level` share the 1–5 scale on purpose:
the gap calculation is a subtraction, and `weight` is what stops every gap
scoring the same.

## Identity

```mermaid
erDiagram
    users ||--o{ sessions : has
    users ||--o{ accounts : has
    users ||--o{ mentorships : "mentors / is mentored"

    users {
        text id PK
        text email UK
        enum role "student|mentor|admin"
        boolean email_verified
    }
    sessions {
        text id PK
        text token UK
        timestamptz expires_at
        text user_id FK
    }
    accounts {
        text id PK
        text provider_id
        text issuer "local:credential"
        text password "argon2id PHC string"
        text user_id FK
    }
    mentorships {
        text mentor_id PK,FK
        text student_id PK,FK
    }
```

Better Auth's tables, adopted as source rather than regenerated. Four
hand-applied edits are documented in `packages/db/src/schema/auth.ts` and must
survive any regeneration: the `user_role` enum, `withTimezone` on every
timestamp, the `rate_limits` table keeping its `id` column, and `accounts.issuer`.

The password hash lives on `accounts`, never on `users`. `mentorships` exists so
a mentor's read access is a join, not a role-string comparison.

## Student evidence

```mermaid
erDiagram
    users ||--|| profiles : has
    users ||--o{ student_skills : claims
    users ||--o{ projects : built
    users ||--o{ certifications : earned
    users ||--o{ uploads : uploaded
    projects ||--o{ project_skills : demonstrates
    profiles }o--|| target_roles : "aims at"

    profiles {
        text user_id PK,FK
        enum experience_level
        uuid target_role_id FK
        uuid cv_upload_id FK
    }
    student_skills {
        text user_id PK,FK
        uuid skill_id PK,FK
        smallint level "1-5"
        enum source "self_reported|assessment|project|certification"
        text evidence
    }
```

`source` is why the roadmap can weigh a claim differently from a result. An
assessment overwrites `self_reported` and earlier `assessment` rows and leaves
`project` and `certification` rows untouched.

## Assessment and progress

```mermaid
erDiagram
    assessments ||--o{ questions : contains
    assessments ||--o{ attempts : "sat as"
    attempts ||--o{ attempt_answers : records
    questions ||--o{ attempt_answers : answered_by
    users ||--o{ skill_state : schedules
    users ||--o{ reviews : logged

    assessments {
        uuid id PK
        text slug UK
        uuid skill_id FK "usually a SUBCATEGORY"
        boolean published
    }
    questions {
        uuid id PK
        uuid assessment_id FK
        integer ordinal UK "unique with assessment_id"
        enum type "recall|cloze|mcq"
        jsonb choices
        integer_array correct
        uuid skill_id FK "finer-grained than the assessment"
        smallint difficulty "1-5"
    }
    attempts {
        uuid id PK
        integer score
        integer max_score
        timestamptz completed_at
    }
    skill_state {
        text user_id PK,FK
        uuid skill_id PK,FK
        timestamptz due
        double stability
        double difficulty
        smallint state "0-3"
    }
```

`questions.skill_id` being finer-grained than `assessments.skill_id` is what
lets one sitting produce a per-skill breakdown instead of a single score.

`skill_state` is FSRS keyed on a **skill**, not a flashcard. Every column is
needed to reconstruct a `ts-fsrs` Card; `state` in particular selects which
scheduling branch runs. Proficiency decays and has to be re-earned.

The `(assessment_id, ordinal)` unique index is the natural key the seed upserts
on, so re-seeding updates a question in place instead of orphaning the attempt
answers that reference it.

## Roadmap

```mermaid
erDiagram
    users ||--o{ roadmaps : generated
    target_roles ||--o{ roadmaps : "aimed at"
    roadmaps ||--o{ roadmap_phases : "layered into"
    roadmap_phases ||--o{ roadmap_phase_skills : contains
    skills ||--o{ roadmap_phase_skills : "scheduled in"

    roadmaps {
        uuid id PK
        enum status "draft|active|archived"
        smallint readiness_score "0-100, frozen"
        text narration "LLM writes this"
    }
    roadmap_phases {
        uuid id PK
        integer phase "topological rank"
        text title
        text rationale "LLM writes this"
        smallint estimated_weeks
    }
    roadmap_phase_skills {
        uuid phase_id PK,FK
        uuid skill_id PK,FK
        integer ordinal
        smallint gap_score
    }
```

Stored output, not a source of truth. Python computes `phase` and ordering; the
LLM only fills `narration` and `rationale`. `readiness_score` is frozen at
generation rather than computed on read, so regenerating later shows movement
instead of overwriting the evidence of it.

## Making changes

Follow `.claude/skills/db-change/SKILL.md`. Typechecking does not prove a check
constraint is valid SQL — every migration is verified against a real Postgres,
and the constraint is proven to bite by inserting a row that should fail.
