export type SeedQuestion = {
  type: "recall" | "cloze" | "mcq";
  question: string;
  /** Leaf skill slug. Finer-grained than the assessment's own subcategory —
   *  this is what makes one sitting produce a per-skill breakdown. */
  skill: string;
  difficulty: number;
  /** recall and cloze. Pipe-separated when more than one answer is accepted;
   *  matching is case- and punctuation-insensitive. */
  answer?: string;
  choices?: string[];
  /** Indices into `choices`. */
  correct?: number[];
  explanation?: string;
};

export type SeedAssessment = {
  slug: string;
  title: string;
  description: string;
  /** The SUBCATEGORY this sitting covers, so one attempt spans a coherent area. */
  skill: string;
  questions: SeedQuestion[];
};

/**
 * The six areas the requirements PDF names, one assessment each. Question
 * ordinals are positional — reordering this array renumbers them, and the
 * upsert in seed/index.ts keys on (assessment, ordinal), so append rather than
 * insert if attempt history already exists.
 */
export const ASSESSMENTS: SeedAssessment[] = [
  {
    slug: "python-fundamentals",
    title: "Python",
    description:
      "Syntax, data structures, error handling and the parts of the standard library a working Python developer uses daily.",
    skill: "programming-languages",
    questions: [
      {
        type: "recall",
        question: "Which keyword defines a function in Python?",
        skill: "python",
        difficulty: 1,
        answer: "def",
        explanation: "`def name(args):` opens a function body.",
      },
      {
        type: "mcq",
        question: "Which of these built-in types is immutable?",
        skill: "data-structures",
        difficulty: 2,
        choices: ["list", "dict", "tuple", "set"],
        correct: [2],
        explanation:
          "Tuples cannot be modified after creation, which is why they can be dictionary keys.",
      },
      {
        type: "cloze",
        question:
          "The ____ statement ends the current loop iteration and moves on to the next one.",
        skill: "control-flow",
        difficulty: 2,
        answer: "continue",
      },
      {
        type: "mcq",
        question:
          "Which block runs whether or not an exception was raised in the try body?",
        skill: "error-handling",
        difficulty: 3,
        choices: ["try", "except", "finally", "else"],
        correct: [2],
        explanation:
          "`finally` is for cleanup that must happen on both paths — closing a file, releasing a lock.",
      },
      {
        type: "recall",
        question:
          "What is the conventional name for the first parameter of an instance method?",
        skill: "oop",
        difficulty: 3,
        answer: "self",
      },
      {
        type: "mcq",
        question: "What does the expression `{1, 2, 2, 3}` evaluate to?",
        skill: "data-structures",
        difficulty: 3,
        choices: ["{1, 2, 2, 3}", "{1, 2, 3}", "[1, 2, 3]", "a TypeError"],
        correct: [1],
        explanation: "A set holds each distinct value once.",
      },
      {
        type: "cloze",
        question:
          "Pinned dependencies for a Python project conventionally live in a file named ____.txt",
        skill: "package-management",
        difficulty: 2,
        answer: "requirements",
      },
      {
        type: "mcq",
        question: "pytest discovers a test function when its name starts with:",
        skill: "unit-testing",
        difficulty: 3,
        choices: ["check_", "test_", "assert_", "should_"],
        correct: [1],
      },
      {
        type: "recall",
        question:
          "Which built-in applies a function to every item of an iterable and returns an iterator?",
        skill: "functional-programming",
        difficulty: 4,
        answer: "map",
      },
      {
        type: "mcq",
        question: "What does CPython's Global Interpreter Lock prevent?",
        skill: "concurrency",
        difficulty: 4,
        choices: [
          "Two threads executing Python bytecode at the same time",
          "Running more than one process",
          "Memory leaks in C extensions",
          "Recursion deeper than 1000 frames",
        ],
        correct: [0],
        explanation:
          "It is why CPU-bound Python parallelises with processes rather than threads.",
      },
    ],
  },
  {
    slug: "web-development-fundamentals",
    title: "Web Development",
    description:
      "HTML, CSS, JavaScript and the HTTP semantics underneath the interfaces you build on top of them.",
    skill: "web-development",
    questions: [
      {
        type: "mcq",
        question: "Which element marks the most important heading on a page?",
        skill: "html",
        difficulty: 1,
        choices: ["<h1>", "<head>", "<header>", "<title>"],
        correct: [0],
      },
      {
        type: "recall",
        question:
          "Which CSS property controls the space between an element's content and its border?",
        skill: "css",
        difficulty: 2,
        answer: "padding",
      },
      {
        type: "mcq",
        question: "Which HTTP status code means the resource was not found?",
        skill: "http-fundamentals",
        difficulty: 2,
        choices: ["301", "404", "500", "204"],
        correct: [1],
      },
      {
        type: "cloze",
        question:
          "`const` and ____ are the two block-scoped declaration keywords in modern JavaScript.",
        skill: "javascript",
        difficulty: 2,
        answer: "let",
      },
      {
        type: "mcq",
        question: "What does an `async` function always return?",
        skill: "async-javascript",
        difficulty: 3,
        choices: ["a Promise", "undefined", "a callback", "a generator"],
        correct: [0],
        explanation:
          "Even `async function f() { return 1 }` resolves to a Promise of 1.",
      },
      {
        type: "recall",
        question:
          "Which HTTP method replaces a resource entirely and is idempotent?",
        skill: "rest-api",
        difficulty: 3,
        answer: "PUT",
      },
      {
        type: "mcq",
        question: "What is the `alt` attribute on an image for?",
        skill: "web-accessibility",
        difficulty: 3,
        choices: [
          "A text alternative announced by screen readers and shown if the image fails",
          "A tooltip shown on hover",
          "The image caption printed below it",
          "A fallback image URL",
        ],
        correct: [0],
        explanation: "`title` produces the tooltip; `alt` is the text alternative.",
      },
      {
        type: "cloze",
        question:
          "`document.____('#main')` returns the first element matching a CSS selector.",
        skill: "dom-manipulation",
        difficulty: 2,
        answer: "querySelector",
      },
      {
        type: "mcq",
        question: "Which React hook holds state in a function component?",
        skill: "react",
        difficulty: 3,
        choices: ["useState", "useEffect", "useMemo", "useRef"],
        correct: [0],
      },
      {
        type: "mcq",
        question:
          "Which CSS at-rule applies styles conditionally on viewport width?",
        skill: "responsive-design",
        difficulty: 3,
        choices: ["@media", "@supports", "@import", "@layer"],
        correct: [0],
      },
    ],
  },
  {
    slug: "git-fundamentals",
    title: "Git",
    description:
      "Everyday version control: staging, branching, merging, and the conventions teams share around them.",
    skill: "version-control",
    questions: [
      {
        type: "recall",
        question:
          "Which command creates a local copy of a remote repository? (command only)",
        skill: "git",
        difficulty: 1,
        answer: "git clone|clone",
      },
      {
        type: "mcq",
        question: "Which command stages a file for the next commit?",
        skill: "git",
        difficulty: 2,
        choices: ["git add", "git commit", "git push", "git stage"],
        correct: [0],
      },
      {
        type: "cloze",
        question:
          "`git ____ -b feature/login` creates a branch and switches to it in one step.",
        skill: "branching-merging",
        difficulty: 2,
        answer: "checkout|switch",
      },
      {
        type: "mcq",
        question:
          "Which marker separates the two sides of a merge conflict in a file?",
        skill: "merge-conflicts",
        difficulty: 3,
        choices: ["<<<<<<<", "=======", ">>>>>>>", "|||||||"],
        correct: [1],
        explanation:
          "`<<<<<<<` opens your side, `=======` divides, `>>>>>>>` closes theirs.",
      },
      {
        type: "recall",
        question:
          "Which command replays commits onto a new base instead of creating a merge commit?",
        skill: "git-rebase",
        difficulty: 4,
        answer: "git rebase|rebase",
      },
      {
        type: "mcq",
        question: "A pull request is best described as:",
        skill: "pull-requests",
        difficulty: 2,
        choices: [
          "A request to merge one branch into another, with review",
          "A command that fetches remote changes",
          "A way to revert a published commit",
          "A backup copy of a branch",
        ],
        correct: [0],
      },
      {
        type: "cloze",
        question:
          "In semantic versioning, a breaking change increments the ____ number.",
        skill: "semantic-versioning",
        difficulty: 3,
        answer: "major",
      },
      {
        type: "mcq",
        question: "Which command shows the commit history of the current branch?",
        skill: "git",
        difficulty: 3,
        choices: ["git log", "git status", "git diff", "git show"],
        correct: [0],
      },
      {
        type: "recall",
        question: "Which file lists paths Git should not track?",
        skill: "git",
        difficulty: 2,
        answer: ".gitignore|gitignore",
      },
      {
        type: "mcq",
        question: "Where do GitHub Actions workflow files live?",
        skill: "github-actions",
        difficulty: 4,
        choices: [
          ".github/workflows/",
          ".github/actions/",
          "ci/",
          ".workflows/",
        ],
        correct: [0],
      },
    ],
  },
  {
    slug: "devops-fundamentals",
    title: "DevOps",
    description:
      "Linux, containers, orchestration and the pipeline that gets code from a branch onto a server.",
    skill: "devops",
    questions: [
      {
        type: "mcq",
        question: "Which command prints the current working directory?",
        skill: "linux-commands",
        difficulty: 1,
        choices: ["pwd", "ls", "cd", "whoami"],
        correct: [0],
      },
      {
        type: "recall",
        question: "Which command changes a file's permission bits?",
        skill: "file-permissions",
        difficulty: 3,
        answer: "chmod",
      },
      {
        type: "cloze",
        question:
          "A Docker ____ is the read-only template a container is started from.",
        skill: "docker",
        difficulty: 2,
        answer: "image",
      },
      {
        type: "mcq",
        question:
          "Which Dockerfile instruction sets the default command run when the container starts?",
        skill: "dockerfile",
        difficulty: 3,
        choices: ["RUN", "CMD", "COPY", "FROM"],
        correct: [1],
        explanation:
          "`RUN` executes at build time; `CMD` is what the started container runs.",
      },
      {
        type: "mcq",
        question:
          "In a Compose file, which key makes one service start after another?",
        skill: "docker-compose",
        difficulty: 3,
        choices: ["depends_on", "links", "networks", "volumes"],
        correct: [0],
      },
      {
        type: "recall",
        question: "What is the smallest deployable unit in Kubernetes?",
        skill: "kubernetes",
        difficulty: 3,
        answer: "pod",
      },
      {
        type: "mcq",
        question:
          "Which Kubernetes object keeps a specified number of pod replicas running?",
        skill: "kubernetes-manifests",
        difficulty: 4,
        choices: ["Deployment", "Service", "ConfigMap", "Ingress"],
        correct: [0],
      },
      {
        type: "cloze",
        question:
          "Continuous ____ is the practice of building and testing every push automatically.",
        skill: "continuous-integration",
        difficulty: 3,
        answer: "integration",
      },
      {
        type: "mcq",
        question: "What does a reverse proxy do?",
        skill: "reverse-proxy",
        difficulty: 3,
        choices: [
          "Accepts client requests and forwards them to backend servers",
          "Lets clients on a private network reach the internet",
          "Encrypts traffic between two databases",
          "Caches DNS lookups for a LAN",
        ],
        correct: [0],
      },
      {
        type: "mcq",
        question: "What is the main benefit of infrastructure as code?",
        skill: "infrastructure-as-code",
        difficulty: 4,
        choices: [
          "Infrastructure is version-controlled, reviewable and reproducible",
          "Servers become cheaper to run",
          "Applications need no configuration",
          "Deployments stop requiring tests",
        ],
        correct: [0],
      },
    ],
  },
  {
    slug: "ai-fundamentals",
    title: "AI",
    description:
      "Machine learning foundations: training, evaluation, the failure modes that matter, and modern model architectures.",
    skill: "machine-learning",
    questions: [
      {
        type: "mcq",
        question: "Supervised learning requires:",
        skill: "supervised-learning",
        difficulty: 2,
        choices: [
          "Labelled training data",
          "Only unlabelled data",
          "A reward signal from an environment",
          "A graph structure over the inputs",
        ],
        correct: [0],
      },
      {
        type: "recall",
        question:
          "Which metric is the harmonic mean of precision and recall?",
        skill: "model-evaluation",
        difficulty: 3,
        answer: "F1|F1 score|f1-score",
      },
      {
        type: "cloze",
        question:
          "In k-fold cross-validation the data is split into k ____ of roughly equal size.",
        skill: "cross-validation",
        difficulty: 3,
        answer: "folds",
      },
      {
        type: "mcq",
        question: "Which problem does regularization address?",
        skill: "regularization",
        difficulty: 4,
        choices: ["Overfitting", "Underfitting", "Class imbalance", "Missing values"],
        correct: [0],
        explanation:
          "It penalises large weights, so the model fits signal rather than noise.",
      },
      {
        type: "mcq",
        question:
          "A classifier scores 99% accuracy on data where 99% of rows are one class. What follows?",
        skill: "model-evaluation",
        difficulty: 3,
        choices: [
          "It may be no better than always predicting the majority class",
          "It is a strong model",
          "It has certainly overfitted",
          "The data must be mislabelled",
        ],
        correct: [0],
        explanation:
          "Accuracy on imbalanced data hides everything; look at recall on the minority class.",
      },
      {
        type: "recall",
        question:
          "What is the hyperparameter that controls step size in gradient descent called?",
        skill: "gradient-descent",
        difficulty: 4,
        answer: "learning rate|alpha",
      },
      {
        type: "mcq",
        question: "What does an activation function introduce into a network?",
        skill: "neural-networks",
        difficulty: 3,
        choices: ["Non-linearity", "Regularization", "Normalization", "Sparsity"],
        correct: [0],
        explanation:
          "Without one, stacked linear layers collapse into a single linear layer.",
      },
      {
        type: "cloze",
        question: "k-means clustering is an example of ____ learning.",
        skill: "unsupervised-learning",
        difficulty: 3,
        answer: "unsupervised",
      },
      {
        type: "mcq",
        question: "The core mechanism of a transformer is:",
        skill: "transformers",
        difficulty: 4,
        choices: ["Self-attention", "Convolution", "Recurrence", "Max pooling"],
        correct: [0],
      },
      {
        type: "mcq",
        question: "In retrieval-augmented generation, what is retrieved?",
        skill: "rag",
        difficulty: 4,
        choices: [
          "Relevant documents, added to the prompt as context",
          "Model weights for the current task",
          "Previous completions from a cache",
          "Training examples to fine-tune on",
        ],
        correct: [0],
      },
    ],
  },
  {
    slug: "database-fundamentals",
    title: "Database",
    description:
      "Relational modelling, SQL, indexing and the operational habits that keep a schema trustworthy.",
    skill: "databases",
    questions: [
      {
        type: "mcq",
        question: "Which SQL clause filters rows before grouping?",
        skill: "sql",
        difficulty: 1,
        choices: ["WHERE", "HAVING", "ORDER BY", "LIMIT"],
        correct: [0],
        explanation: "`HAVING` filters after grouping; `WHERE` filters before.",
      },
      {
        type: "recall",
        question:
          "Which join returns only the rows that have a match in both tables?",
        skill: "joins",
        difficulty: 3,
        answer: "inner join|inner",
      },
      {
        type: "cloze",
        question:
          "The column that uniquely identifies each row in a table is the ____ key.",
        skill: "relational-modelling",
        difficulty: 2,
        answer: "primary",
      },
      {
        type: "mcq",
        question: "Third normal form removes:",
        skill: "database-normalization",
        difficulty: 4,
        choices: [
          "Transitive dependencies on the primary key",
          "All duplicate rows",
          "NULL values",
          "Foreign key constraints",
        ],
        correct: [0],
      },
      {
        type: "mcq",
        question: "Adding an index primarily improves:",
        skill: "indexing",
        difficulty: 3,
        choices: [
          "Read performance for queries that match it",
          "Write performance",
          "Storage footprint",
          "Backup speed",
        ],
        correct: [0],
        explanation: "Writes get slower — the index has to be maintained too.",
      },
      {
        type: "recall",
        question: "What does the A in ACID stand for?",
        skill: "transactions",
        difficulty: 3,
        answer: "atomicity|atomic",
      },
      {
        type: "cloze",
        question:
          "`SELECT COUNT(*) FROM users` returns the number of ____ in the table.",
        skill: "sql",
        difficulty: 2,
        answer: "rows|records",
      },
      {
        type: "mcq",
        question: "Why are migrations checked into version control?",
        skill: "database-migrations",
        difficulty: 3,
        choices: [
          "So schema changes are reproducible, reviewable and ordered",
          "So the database can be queried faster",
          "Because ORMs require it",
          "To keep production credentials with the schema",
        ],
        correct: [0],
      },
      {
        type: "mcq",
        question: "Which practice prevents SQL injection?",
        skill: "sql-injection",
        difficulty: 4,
        choices: [
          "Parameterised queries",
          "Escaping quotes by hand",
          "Hiding database error messages",
          "Switching to a NoSQL database",
        ],
        correct: [0],
        explanation:
          "Hiding errors and swapping engines change the symptom, not the flaw.",
      },
      {
        type: "mcq",
        question: "What does a vector database index?",
        skill: "vector-databases",
        difficulty: 4,
        choices: [
          "Embeddings, for nearest-neighbour search",
          "Full-text tokens only",
          "Binary blobs by checksum",
          "Foreign key relationships",
        ],
        correct: [0],
      },
    ],
  },
];
