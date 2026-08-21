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
 * The first eight cover every seeded subcategory once — the first six are
 * the areas the requirements PDF names; Data Analysis and Cloud and Security
 * cover the remaining two so every branch of the taxonomy has a sitting, not
 * just the six the PDF calls out by name. The rest are second sittings for a
 * subcategory, going deeper into skills the fundamentals assessment didn't
 * reach. Question ordinals are positional — reordering this array renumbers
 * them, and the upsert in seed/index.ts keys on (assessment, ordinal), so
 * append rather than insert if attempt history already exists.
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
  {
    slug: "data-analysis-fundamentals",
    title: "Data Analysis",
    description:
      "NumPy and pandas, cleaning and exploring a dataset, the statistics underneath a claim, and getting a result in front of someone.",
    skill: "data-analysis",
    questions: [
      {
        type: "mcq",
        question:
          "Which library provides fast n-dimensional array operations in Python?",
        skill: "numpy",
        difficulty: 1,
        choices: ["NumPy", "Pandas", "Matplotlib", "Requests"],
        correct: [0],
      },
      {
        type: "recall",
        question:
          "Which pandas DataFrame method returns the first n rows, by default 5?",
        skill: "pandas",
        difficulty: 1,
        answer: "head",
      },
      {
        type: "cloze",
        question:
          "A ____ notebook mixes runnable code cells with markdown documentation, one cell at a time.",
        skill: "jupyter",
        difficulty: 2,
        answer: "jupyter",
      },
      {
        type: "mcq",
        question:
          "Which pandas method drops rows that contain missing values?",
        skill: "data-cleaning",
        difficulty: 2,
        choices: ["dropna", "fillna", "drop_duplicates", "isna"],
        correct: [0],
        explanation:
          "`fillna` keeps the row and substitutes a value instead; `isna` only flags them.",
      },
      {
        type: "mcq",
        question: "Which measure of central tendency is most sensitive to outliers?",
        skill: "descriptive-statistics",
        difficulty: 2,
        choices: ["Mean", "Median", "Mode", "Range"],
        correct: [0],
        explanation:
          "The median only cares about the middle position, so a handful of extreme values can't drag it.",
      },
      {
        type: "cloze",
        question:
          "Two events are ____ if the occurrence of one does not change the probability of the other.",
        skill: "probability",
        difficulty: 3,
        answer: "independent",
      },
      {
        type: "mcq",
        question:
          "A hypothesis test returns a p-value below your significance threshold. What do you conclude?",
        skill: "hypothesis-testing",
        difficulty: 3,
        choices: [
          "Reject the null hypothesis",
          "Accept the null hypothesis",
          "Reject the alternative hypothesis",
          "The sample size was too small to conclude anything",
        ],
        correct: [0],
      },
      {
        type: "recall",
        question:
          "Which Matplotlib function creates a new figure and a grid of axes in one call?",
        skill: "matplotlib",
        difficulty: 3,
        answer: "subplots|plt.subplots",
      },
      {
        type: "mcq",
        question:
          "Which SQL clause groups rows sharing a value so an aggregate can be computed per group?",
        skill: "sql-for-analytics",
        difficulty: 2,
        choices: ["GROUP BY", "ORDER BY", "WHERE", "PARTITION"],
        correct: [0],
      },
      {
        type: "mcq",
        question:
          "In time series data, a pattern that repeats on a fixed calendar interval — daily, weekly, yearly — is called:",
        skill: "time-series-analysis",
        difficulty: 4,
        choices: ["Seasonality", "Trend", "White noise", "Autocorrelation"],
        correct: [0],
        explanation:
          "Trend is the long-run direction; seasonality is the part that repeats on a clock.",
      },
    ],
  },
  {
    slug: "cloud-security-fundamentals",
    title: "Cloud & Security",
    description:
      "Cloud computing primitives, and the practices that keep a deployed service and its data from being the easy target.",
    skill: "cloud-and-security",
    questions: [
      {
        type: "mcq",
        question: "In cloud computing, what does 'elasticity' mean?",
        skill: "cloud-fundamentals",
        difficulty: 1,
        choices: [
          "Capacity scales up or down automatically with demand",
          "Servers are physically portable",
          "Data is stored in more than one format",
          "Downtime is guaranteed to be zero",
        ],
        correct: [0],
      },
      {
        type: "cloze",
        question:
          "In a serverless platform, compute is provisioned only while a ____ is actually running, not continuously.",
        skill: "serverless",
        difficulty: 2,
        answer: "function",
      },
      {
        type: "mcq",
        question: "An IAM policy primarily controls:",
        skill: "iam",
        difficulty: 2,
        choices: [
          "Which identities can perform which actions on which resources",
          "How fast a network connection is",
          "How data is compressed at rest",
          "Which region a server runs in",
        ],
        correct: [0],
      },
      {
        type: "mcq",
        question:
          "A service needs a database password at deploy time. Where should it come from?",
        skill: "secrets-management",
        difficulty: 3,
        choices: [
          "A secrets manager or injected environment variable, never the repo",
          "Committed in plaintext next to the code that uses it",
          "A comment in the Dockerfile",
          "A shared spreadsheet the team keeps updated",
        ],
        correct: [0],
      },
      {
        type: "recall",
        question: "Which port does HTTPS use by default?",
        skill: "https-tls",
        difficulty: 2,
        answer: "443",
      },
      {
        type: "mcq",
        question: "Encryption 'at rest' protects data:",
        skill: "data-encryption",
        difficulty: 3,
        choices: [
          "While it sits on disk or in a backup",
          "Only while it travels over the network",
          "Only inside application memory",
          "Only during the nightly backup job",
        ],
        correct: [0],
        explanation: "Data moving over the wire is 'in transit', a separate property.",
      },
      {
        type: "mcq",
        question:
          "Why hash a password with a per-user salt instead of hashing it alone?",
        skill: "password-hashing",
        difficulty: 3,
        choices: [
          "It stops a precomputed rainbow table from matching every user at once",
          "It makes the hash reversible if the password is forgotten",
          "It speeds up the login check",
          "It removes the need for a slow hash algorithm",
        ],
        correct: [0],
      },
      {
        type: "mcq",
        question: "Authentication answers which question?",
        skill: "authentication",
        difficulty: 2,
        choices: [
          "Who is this?",
          "What is this identity allowed to do?",
          "Is this connection encrypted?",
          "Is this input well-formed?",
        ],
        correct: [0],
        explanation: "Authorization is the one that answers \"what are they allowed to do\".",
      },
      {
        type: "mcq",
        question:
          "A signed-in user requests another user's private data by editing the URL's id. Which control should stop them?",
        skill: "authorization",
        difficulty: 3,
        choices: [
          "A server-side check that the resource belongs to the caller",
          "A stronger password policy",
          "TLS on the connection",
          "Rate limiting the endpoint",
        ],
        correct: [0],
        explanation:
          "This is the OWASP class \"broken access control\" — being logged in isn't the same as being allowed.",
      },
      {
        type: "recall",
        question:
          "What is the name of the OWASP list ranking the most critical web application security risks?",
        skill: "owasp-top-ten",
        difficulty: 4,
        answer: "OWASP Top Ten|OWASP Top 10|Top Ten|Top 10",
      },
    ],
  },
  {
    slug: "python-advanced",
    title: "Python: Algorithms & Craft",
    description:
      "Complexity, concurrency, typing and the habits that separate code that runs from code a team can maintain.",
    skill: "programming-languages",
    questions: [
      {
        type: "mcq",
        question: "What is the time complexity of a binary search on a sorted array?",
        skill: "algorithms",
        difficulty: 2,
        choices: ["O(1)", "O(log n)", "O(n)", "O(n log n)"],
        correct: [1],
      },
      {
        type: "recall",
        question:
          "Which sorting algorithm does Python's built-in `sorted()` use?",
        skill: "algorithms",
        difficulty: 4,
        answer: "Timsort|timsort",
      },
      {
        type: "mcq",
        question:
          "Two threads increment the same counter without a lock. What can result?",
        skill: "concurrency",
        difficulty: 4,
        choices: [
          "A race condition — updates can be lost",
          "A deadlock every time",
          "A SyntaxError at import time",
          "Nothing; the GIL makes this always safe",
        ],
        correct: [0],
        explanation:
          "The GIL serialises bytecode execution, not the read-modify-write sequence a `+=` compiles to.",
      },
      {
        type: "cloze",
        question:
          "`multiprocessing` sidesteps the GIL by running each worker in its own ____, not a thread.",
        skill: "concurrency",
        difficulty: 3,
        answer: "process",
      },
      {
        type: "recall",
        question:
          "Which module provides `Optional`, `Union` and `List` for type hints?",
        skill: "type-systems",
        difficulty: 2,
        answer: "typing",
      },
      {
        type: "mcq",
        question: "What does a static type checker like mypy do?",
        skill: "type-systems",
        difficulty: 3,
        choices: [
          "Flags type mismatches without running the code",
          "Rewrites the code to be faster",
          "Enforces types at runtime, raising on mismatch",
          "Converts the file to a compiled binary",
        ],
        correct: [0],
        explanation:
          "Python's type hints are unenforced at runtime — mypy is a separate, offline pass.",
      },
      {
        type: "mcq",
        question:
          "Which tool lets you step through running code line by line at a breakpoint?",
        skill: "debugging",
        difficulty: 2,
        choices: ["pdb", "pip", "venv", "black"],
        correct: [0],
      },
      {
        type: "cloze",
        question:
          "In a regular expression, `\\d+` matches one or more ____.",
        skill: "regular-expressions",
        difficulty: 2,
        answer: "digits",
      },
      {
        type: "mcq",
        question: "What is the main purpose of a code review?",
        skill: "code-review",
        difficulty: 2,
        choices: [
          "Catch defects and share context before code reaches main",
          "Enforce a single author's preferred style at any cost",
          "Replace automated tests",
          "Slow down merges so fewer ship each week",
        ],
        correct: [0],
      },
      {
        type: "mcq",
        question:
          "A function is called recursively with no base case reached. What happens?",
        skill: "algorithms",
        difficulty: 3,
        choices: [
          "RecursionError once the call stack limit is hit",
          "It silently returns None",
          "Python raises a TypeError immediately",
          "It runs forever with constant memory",
        ],
        correct: [0],
      },
    ],
  },
  {
    slug: "web-frameworks-apis",
    title: "Web Frameworks & APIs",
    description:
      "TypeScript, React state, server-side JavaScript and the API design choices that shape a frontend's contract with its backend.",
    skill: "web-development",
    questions: [
      {
        type: "mcq",
        question: "What does adding a type annotation to a TypeScript variable do at runtime?",
        skill: "typescript",
        difficulty: 2,
        choices: [
          "Nothing — types are erased before the code runs",
          "It throws if the value ever changes type",
          "It slows down execution to check the type",
          "It converts the value to that type",
        ],
        correct: [0],
        explanation: "TypeScript's checking is entirely at compile time; the emitted JS has no types.",
      },
      {
        type: "recall",
        question:
          "Which React hook lets a component read and update shared state via a reducer function?",
        skill: "state-management",
        difficulty: 3,
        answer: "useReducer",
      },
      {
        type: "mcq",
        question: "In Next.js App Router, what does a Server Component do?",
        skill: "nextjs",
        difficulty: 3,
        choices: [
          "Renders on the server and ships no client JS by default",
          "Only runs in the browser",
          "Replaces the need for an API route entirely",
          "Requires `use client` at the top of the file",
        ],
        correct: [0],
      },
      {
        type: "cloze",
        question:
          "Node.js runs JavaScript outside the browser on Google's ____ engine.",
        skill: "nodejs",
        difficulty: 2,
        answer: "V8",
      },
      {
        type: "mcq",
        question: "In Express, what does `app.use(middleware)` do?",
        skill: "express",
        difficulty: 3,
        choices: [
          "Registers a function that runs on matching requests before the route handler",
          "Starts the HTTP server listening",
          "Defines a single GET route",
          "Compiles the app for production",
        ],
        correct: [0],
      },
      {
        type: "mcq",
        question: "What is the main purpose of an OpenAPI specification?",
        skill: "openapi",
        difficulty: 3,
        choices: [
          "A machine-readable contract describing an API's endpoints and shapes",
          "A runtime library that validates incoming requests",
          "A database migration format",
          "A CSS framework for API documentation pages",
        ],
        correct: [0],
      },
      {
        type: "mcq",
        question:
          "A REST client over-fetches unused fields on every request. What does GraphQL let the client do instead?",
        skill: "graphql",
        difficulty: 3,
        choices: [
          "Specify exactly the fields it needs in the query",
          "Cache responses automatically without any code",
          "Skip authentication",
          "Avoid using HTTP entirely",
        ],
        correct: [0],
      },
      {
        type: "recall",
        question:
          "Which build tool bundles and transforms frontend assets — the role Vite or Webpack plays?",
        skill: "frontend-build-tooling",
        difficulty: 2,
        answer: "bundler",
      },
      {
        type: "cloze",
        question:
          "Lifting state ____ means moving it to the nearest common ancestor so sibling components can share it.",
        skill: "state-management",
        difficulty: 3,
        answer: "up",
      },
      {
        type: "mcq",
        question: "Why prefer `unknown` over `any` for a value of uncertain type?",
        skill: "typescript",
        difficulty: 4,
        choices: [
          "`unknown` forces a type check before the value can be used",
          "`unknown` is faster at runtime",
          "`any` is deprecated and no longer compiles",
          "There is no difference",
        ],
        correct: [0],
      },
    ],
  },
  {
    slug: "devops-cicd-infrastructure",
    title: "DevOps: CI/CD & Infrastructure",
    description:
      "Scripting the shell, wiring a pipeline end to end, and the infrastructure-as-code habits that keep a deploy reproducible.",
    skill: "devops",
    questions: [
      {
        type: "mcq",
        question: "What does a shebang line like `#!/bin/bash` at the top of a script do?",
        skill: "shell-scripting",
        difficulty: 2,
        choices: [
          "Tells the OS which interpreter should run the script",
          "Comments out the rest of the file",
          "Imports the bash standard library",
          "Marks the file as executable",
        ],
        correct: [0],
        explanation: "`chmod +x` is what makes it executable; the shebang picks the interpreter.",
      },
      {
        type: "recall",
        question:
          "Which command lists currently running processes on a Linux system?",
        skill: "process-management",
        difficulty: 2,
        answer: "ps",
      },
      {
        type: "mcq",
        question:
          "Two containers on the same Docker Compose network reach each other by:",
        skill: "container-networking",
        difficulty: 3,
        choices: [
          "Service name, resolved via Compose's built-in DNS",
          "Hardcoded IP addresses set in the Dockerfile",
          "Only the host machine's localhost",
          "A shared volume mount",
        ],
        correct: [0],
      },
      {
        type: "cloze",
        question:
          "A CI/CD pipeline that also deploys automatically on a passing build is doing continuous ____.",
        skill: "cicd",
        difficulty: 3,
        answer: "deployment|delivery",
      },
      {
        type: "mcq",
        question: "What does `terraform plan` do?",
        skill: "terraform",
        difficulty: 3,
        choices: [
          "Shows what changes would be made without applying them",
          "Applies changes immediately",
          "Destroys all managed infrastructure",
          "Formats the .tf files",
        ],
        correct: [0],
      },
      {
        type: "mcq",
        question:
          "A service is silently failing in production with no alert. What is missing?",
        skill: "monitoring-logging",
        difficulty: 3,
        choices: [
          "Observability — metrics, logs or alerting on the failure condition",
          "A bigger server",
          "More unit tests",
          "A second load balancer",
        ],
        correct: [0],
      },
      {
        type: "recall",
        question:
          "What is the deployment strategy called that routes traffic to a new version gradually, watching for errors before finishing the rollout?",
        skill: "deployment-strategies",
        difficulty: 4,
        answer: "canary",
      },
      {
        type: "mcq",
        question: "A blue-green deployment reduces downtime by:",
        skill: "deployment-strategies",
        difficulty: 4,
        choices: [
          "Running old and new versions side by side and switching traffic at once",
          "Deploying to half the servers only",
          "Skipping the test suite to deploy faster",
          "Restarting the database between deploys",
        ],
        correct: [0],
      },
      {
        type: "cloze",
        question:
          "`kill -9` sends the ____ signal, which a process cannot catch or ignore.",
        skill: "process-management",
        difficulty: 4,
        answer: "SIGKILL|KILL",
      },
      {
        type: "mcq",
        question: "Why prefer infrastructure as code over clicking through a cloud console?",
        skill: "infrastructure-as-code",
        difficulty: 2,
        choices: [
          "Changes are versioned, reviewable and repeatable across environments",
          "The console is always slower to load",
          "Cloud consoles cannot create databases",
          "It removes the need for backups",
        ],
        correct: [0],
      },
    ],
  },
  {
    slug: "ml-deep-learning-llms",
    title: "Machine Learning: Deep Learning & LLMs",
    description:
      "Model families beyond the basics, deployment, and the transformer-based architectures behind modern LLMs.",
    skill: "machine-learning",
    questions: [
      {
        type: "mcq",
        question: "Logistic regression is typically used for:",
        skill: "logistic-regression",
        difficulty: 2,
        choices: [
          "Binary classification",
          "Continuous value prediction",
          "Clustering unlabeled points",
          "Dimensionality reduction",
        ],
        correct: [0],
        explanation: "Despite the name, it predicts a class probability, not a continuous quantity.",
      },
      {
        type: "recall",
        question:
          "What is the ensemble technique called that trains many decision trees on random subsets and averages their votes?",
        skill: "random-forest",
        difficulty: 3,
        answer: "random forest|bagging",
      },
      {
        type: "mcq",
        question: "Feature engineering is best described as:",
        skill: "feature-engineering",
        difficulty: 3,
        choices: [
          "Transforming raw data into inputs that make patterns easier for a model to learn",
          "Choosing which model architecture to use",
          "Tuning the learning rate",
          "Splitting data into train and test sets",
        ],
        correct: [0],
      },
      {
        type: "mcq",
        question: "Which library provides a consistent `fit`/`predict` API across classical ML models in Python?",
        skill: "scikit-learn",
        difficulty: 2,
        choices: ["scikit-learn", "PyTorch", "NumPy", "Flask"],
        correct: [0],
      },
      {
        type: "cloze",
        question:
          "A convolutional layer applies a small sliding ____ across the input to detect local patterns.",
        skill: "cnn",
        difficulty: 3,
        answer: "kernel|filter",
      },
      {
        type: "mcq",
        question: "Which library is the standard choice for defining and training deep neural networks with dynamic computation graphs in Python?",
        skill: "pytorch",
        difficulty: 3,
        choices: ["PyTorch", "pandas", "Flask", "SQLAlchemy"],
        correct: [0],
      },
      {
        type: "mcq",
        question: "Tokenization in NLP refers to:",
        skill: "nlp",
        difficulty: 2,
        choices: [
          "Splitting text into smaller units a model can consume",
          "Encrypting text before sending it to a model",
          "Removing all punctuation from a document",
          "Translating text between languages",
        ],
        correct: [0],
      },
      {
        type: "recall",
        question:
          "What technique adapts a pretrained LLM to a task by writing an effective instruction, without updating any weights?",
        skill: "prompt-engineering",
        difficulty: 3,
        answer: "prompt engineering|prompting",
      },
      {
        type: "mcq",
        question: "What does it mean to deploy a trained model as an inference endpoint?",
        skill: "model-deployment",
        difficulty: 3,
        choices: [
          "Wrap it behind an API that serves predictions on new input",
          "Retrain it on production traffic automatically",
          "Store its weights in version control",
          "Convert it into a SQL stored procedure",
        ],
        correct: [0],
      },
      {
        type: "mcq",
        question: "MLOps is best described as:",
        skill: "mlops",
        difficulty: 4,
        choices: [
          "The practices for reliably deploying, monitoring and retraining models in production",
          "A framework for writing neural network layers",
          "A statistics library",
          "A synonym for hyperparameter tuning",
        ],
        correct: [0],
      },
    ],
  },
  {
    slug: "databases-design-operations",
    title: "Databases: Design & Operations",
    description:
      "Modelling a schema before you index it, choosing between relational and document stores, and the operational layer underneath.",
    skill: "databases",
    questions: [
      {
        type: "mcq",
        question: "Which SQL clause returns rows in a specified order?",
        skill: "database-queries",
        difficulty: 1,
        choices: ["ORDER BY", "GROUP BY", "WHERE", "HAVING"],
        correct: [0],
      },
      {
        type: "recall",
        question:
          "What is the term for a column in one table that references the primary key of another?",
        skill: "database-design",
        difficulty: 2,
        answer: "foreign key",
      },
      {
        type: "mcq",
        question: "Query optimization often starts by checking:",
        skill: "query-optimization",
        difficulty: 3,
        choices: [
          "The query's execution plan (EXPLAIN)",
          "The application's frontend framework",
          "The size of the Docker image",
          "The Git commit history for the table",
        ],
        correct: [0],
      },
      {
        type: "cloze",
        question:
          "PostgreSQL's `____` extension adds a vector type and nearest-neighbour indexes for embeddings.",
        skill: "postgresql",
        difficulty: 4,
        answer: "pgvector",
      },
      {
        type: "mcq",
        question: "What problem does an ORM primarily solve?",
        skill: "orm",
        difficulty: 3,
        choices: [
          "Mapping between rows in a relational table and objects in application code",
          "Replacing the need for a database entirely",
          "Encrypting data at rest",
          "Load balancing across replicas",
        ],
        correct: [0],
      },
      {
        type: "mcq",
        question: "A NoSQL document store is generally a better fit than a relational database when:",
        skill: "nosql",
        difficulty: 3,
        choices: [
          "Records vary in shape and don't need cross-record joins",
          "You need strict multi-table foreign key constraints",
          "You need ACID transactions across many tables",
          "The data is inherently tabular with fixed columns",
        ],
        correct: [0],
      },
      {
        type: "recall",
        question:
          "Which document-oriented NoSQL database stores records as BSON documents?",
        skill: "mongodb",
        difficulty: 2,
        answer: "MongoDB",
      },
      {
        type: "mcq",
        question: "Redis is most commonly used as:",
        skill: "redis",
        difficulty: 2,
        choices: [
          "An in-memory cache or key-value store for fast lookups",
          "A relational database for financial transactions",
          "A file storage system for large binary blobs",
          "A message queue only, with no other use",
        ],
        correct: [0],
      },
      {
        type: "mcq",
        question: "Why use a connection pool instead of opening a new database connection per request?",
        skill: "connection-pooling",
        difficulty: 4,
        choices: [
          "Opening a connection is expensive; reusing a pool avoids that cost under load",
          "Pools encrypt traffic that raw connections don't",
          "It removes the need for a connection string",
          "It allows skipping authentication",
        ],
        correct: [0],
      },
      {
        type: "mcq",
        question: "In database design, a many-to-many relationship between two tables is modelled with:",
        skill: "database-design",
        difficulty: 3,
        choices: [
          "A join table holding a foreign key to each side",
          "A single shared primary key",
          "A JSON column on either table",
          "Two separate databases",
        ],
        correct: [0],
      },
    ],
  },
  {
    slug: "data-viz-reporting",
    title: "Data Analysis: Visualization & Reporting",
    description:
      "Getting from a cleaned dataset to a chart or dashboard someone else can act on.",
    skill: "data-analysis",
    questions: [
      {
        type: "mcq",
        question: "What is the goal of exploratory data analysis (EDA)?",
        skill: "exploratory-analysis",
        difficulty: 2,
        choices: [
          "Understand a dataset's structure, patterns and anomalies before modelling",
          "Train a final model as fast as possible",
          "Delete all rows with missing values",
          "Write the report's conclusion first",
        ],
        correct: [0],
      },
      {
        type: "mcq",
        question: "A bar chart is generally the better choice over a pie chart when:",
        skill: "data-visualization",
        difficulty: 2,
        choices: [
          "Comparing more than a handful of categories precisely",
          "Showing exactly two categories",
          "There is no categorical data at all",
          "The values are all percentages of a whole",
        ],
        correct: [0],
        explanation:
          "Pie charts make it hard to compare more than a few slices by eye; bars line up on a shared axis.",
      },
      {
        type: "cloze",
        question:
          "A ____ chart shows the distribution of a numeric variable by grouping values into bins.",
        skill: "data-visualization",
        difficulty: 2,
        answer: "histogram",
      },
      {
        type: "recall",
        question:
          "Which Matplotlib call renders the figures built so far when not in an interactive notebook?",
        skill: "matplotlib",
        difficulty: 3,
        answer: "plt.show|show",
      },
      {
        type: "mcq",
        question: "A dashboard that recomputes and displays metrics as new data arrives needs:",
        skill: "dashboarding",
        difficulty: 3,
        choices: [
          "A query layer plus visualization refreshed on a schedule or trigger",
          "Only a static image exported once",
          "A spreadsheet emailed manually each morning",
          "No underlying data source",
        ],
        correct: [0],
      },
      {
        type: "mcq",
        question:
          "Which SQL clause restricts a `GROUP BY` result to groups matching a condition on the aggregate?",
        skill: "sql-for-analytics",
        difficulty: 3,
        choices: ["HAVING", "WHERE", "ORDER BY", "LIMIT"],
        correct: [0],
        explanation: "`WHERE` filters rows before grouping; `HAVING` filters the groups themselves.",
      },
      {
        type: "mcq",
        question: "A pandas Series with several missing values needs a placeholder instead of being dropped. Which method fills them in place of removing rows?",
        skill: "data-cleaning",
        difficulty: 2,
        choices: ["fillna", "dropna", "drop_duplicates", "isna"],
        correct: [0],
      },
      {
        type: "mcq",
        question: "Correlation between two variables tells you:",
        skill: "descriptive-statistics",
        difficulty: 3,
        choices: [
          "How strongly and in what direction they move together — not that one causes the other",
          "That one variable causes the other",
          "The exact slope of a fitted line",
          "Nothing unless the sample size exceeds 1000",
        ],
        correct: [0],
      },
      {
        type: "recall",
        question:
          "What do you call a chart axis or scale that misleadingly starts above zero, exaggerating differences?",
        skill: "data-visualization",
        difficulty: 4,
        answer: "truncated axis|truncated y-axis",
      },
      {
        type: "mcq",
        question: "A time series plotted monthly shows a clear repeating dip every December. This is:",
        skill: "time-series-analysis",
        difficulty: 3,
        choices: ["Seasonality", "A trend", "Random noise", "An outlier"],
        correct: [0],
      },
    ],
  },
  {
    slug: "cloud-networking-appsec",
    title: "Cloud & Security: Networking & App Security",
    description:
      "Where data actually lives in the cloud, the network boundary around it, and closing the gaps OWASP calls out by name.",
    skill: "cloud-and-security",
    questions: [
      {
        type: "mcq",
        question: "Cloud object storage (like S3) is best suited for:",
        skill: "object-storage",
        difficulty: 2,
        choices: [
          "Storing large unstructured files such as images, backups and logs",
          "Running low-latency relational queries",
          "Executing serverless functions",
          "Managing user identities",
        ],
        correct: [0],
      },
      {
        type: "mcq",
        question: "A virtual private network (VPC) primarily provides:",
        skill: "virtual-networks",
        difficulty: 3,
        choices: [
          "An isolated network boundary for cloud resources",
          "Faster CPU performance for compute instances",
          "Automatic database backups",
          "Free egress bandwidth",
        ],
        correct: [0],
      },
      {
        type: "cloze",
        question:
          "Storing configuration like API URLs in ____ variables keeps it separate from code and swappable per environment.",
        skill: "environment-configuration",
        difficulty: 2,
        answer: "environment",
      },
      {
        type: "recall",
        question:
          "What is the name for a security weakness that lets an attacker inject and execute script in another user's browser session?",
        skill: "application-security",
        difficulty: 3,
        answer: "cross-site scripting|XSS",
      },
      {
        type: "mcq",
        question:
          "A login form submits the password over plain HTTP instead of HTTPS. What is exposed?",
        skill: "https-tls",
        difficulty: 2,
        choices: [
          "The password, readable by anyone on the network path",
          "Nothing, as long as the server hashes it",
          "Only the username, never the password",
          "Nothing, browsers block plain HTTP forms automatically",
        ],
        correct: [0],
      },
      {
        type: "mcq",
        question:
          "An application builds a SQL query by concatenating raw user input into the string. What class of vulnerability does this create?",
        skill: "sql-injection",
        difficulty: 3,
        choices: [
          "SQL injection",
          "Cross-site scripting",
          "A denial-of-service attack",
          "A broken authentication flow",
        ],
        correct: [0],
      },
      {
        type: "mcq",
        question: "An IAM policy grants a service account far more permissions than it needs. This violates:",
        skill: "iam",
        difficulty: 3,
        choices: [
          "The principle of least privilege",
          "The CAP theorem",
          "Normalization rules",
          "The single responsibility principle",
        ],
        correct: [0],
      },
      {
        type: "recall",
        question:
          "What algorithm family is designed to be deliberately slow, resisting brute-force password guessing — argon2 and bcrypt are examples?",
        skill: "password-hashing",
        difficulty: 4,
        answer: "key derivation function|KDF|password hashing algorithm",
      },
      {
        type: "mcq",
        question: "Session-based authentication typically works by:",
        skill: "authentication",
        difficulty: 3,
        choices: [
          "Issuing a session token stored server-side and referenced by a cookie",
          "Sending the plaintext password with every request",
          "Requiring no state on either side",
          "Encrypting the entire request body",
        ],
        correct: [0],
      },
      {
        type: "mcq",
        question:
          "A serverless function's cold start refers to:",
        skill: "serverless",
        difficulty: 4,
        choices: [
          "The extra latency when a new instance must initialize before handling a request",
          "The function timing out permanently",
          "A deployment failure",
          "The function running on a cold storage tier",
        ],
        correct: [0],
      },
    ],
  },
];
