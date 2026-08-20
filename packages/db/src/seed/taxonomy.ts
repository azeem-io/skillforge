export type SeedSubcategory = {
  slug: string;
  name: string;
  description: string;
};

export type SeedCategory = {
  slug: string;
  name: string;
  description: string;
  subcategories: SeedSubcategory[];
};

export type SeedSkill = {
  slug: string;
  name: string;
  sub: string;
  description?: string;
  // Slugs of skills that should be learned first. Leaf-to-leaf, acyclic.
  prereqs?: string[];
};

export const CATEGORIES: SeedCategory[] = [
  {
    slug: "software-engineering",
    name: "Software Engineering",
    description: "Writing, testing and shipping software.",
    subcategories: [
      {
        slug: "programming-languages",
        name: "Programming Languages",
        description: "Language fundamentals and general programming craft.",
      },
      {
        slug: "web-development",
        name: "Web Development",
        description: "Building interfaces and the services behind them.",
      },
      {
        slug: "version-control",
        name: "Version Control",
        description: "Collaborating on a codebase without losing work.",
      },
    ],
  },
  {
    slug: "data-and-ai",
    name: "Data and AI",
    description: "Storing, analysing and modelling data.",
    subcategories: [
      {
        slug: "databases",
        name: "Databases",
        description: "Modelling, querying and operating data stores.",
      },
      {
        slug: "data-analysis",
        name: "Data Analysis",
        description: "Turning raw data into something you can reason about.",
      },
      {
        slug: "machine-learning",
        name: "Machine Learning",
        description: "Training, evaluating and serving models.",
      },
    ],
  },
  {
    slug: "infrastructure",
    name: "Infrastructure",
    description: "Running software reliably and safely.",
    subcategories: [
      {
        slug: "devops",
        name: "DevOps",
        description: "Automating the path from commit to production.",
      },
      {
        slug: "cloud-and-security",
        name: "Cloud and Security",
        description: "Cloud primitives and keeping systems defensible.",
      },
    ],
  },
];

export const SKILLS: SeedSkill[] = [
  // ── Programming Languages ────────────────────────────────────────────
  // control-flow, oop, error-handling and package-management are deliberately
  // language-agnostic and depend on no specific language. Hanging them off
  // python made React appear to require Python.
  { slug: "python", name: "Python", sub: "programming-languages", description: "General-purpose language used across scripting, web backends and data work." },
  { slug: "control-flow", name: "Control Flow and Loops", sub: "programming-languages" },
  { slug: "data-structures", name: "Data Structures", sub: "programming-languages", prereqs: ["control-flow"] },
  { slug: "algorithms", name: "Algorithms", sub: "programming-languages", prereqs: ["data-structures"] },
  { slug: "oop", name: "Object-Oriented Programming", sub: "programming-languages", prereqs: ["control-flow"] },
  { slug: "functional-programming", name: "Functional Programming", sub: "programming-languages", prereqs: ["control-flow"] },
  { slug: "error-handling", name: "Error Handling", sub: "programming-languages", prereqs: ["control-flow"] },
  { slug: "unit-testing", name: "Unit Testing", sub: "programming-languages", prereqs: ["oop", "error-handling"] },
  { slug: "debugging", name: "Debugging", sub: "programming-languages", prereqs: ["error-handling"] },
  { slug: "regular-expressions", name: "Regular Expressions", sub: "programming-languages", prereqs: ["control-flow"] },
  { slug: "package-management", name: "Package Management", sub: "programming-languages" },
  { slug: "concurrency", name: "Concurrency", sub: "programming-languages", prereqs: ["algorithms"] },
  { slug: "type-systems", name: "Type Systems", sub: "programming-languages", prereqs: ["oop"] },
  { slug: "code-review", name: "Code Review", sub: "programming-languages", prereqs: ["unit-testing"] },

  // ── Web Development ──────────────────────────────────────────────────
  { slug: "html", name: "HTML", sub: "web-development", description: "Document structure and semantics." },
  { slug: "css", name: "CSS", sub: "web-development", prereqs: ["html"] },
  { slug: "responsive-design", name: "Responsive Web Design", sub: "web-development", prereqs: ["css"] },
  { slug: "web-accessibility", name: "Web Accessibility", sub: "web-development", prereqs: ["html"] },
  { slug: "javascript", name: "JavaScript", sub: "web-development", prereqs: ["html"] },
  { slug: "dom-manipulation", name: "DOM Manipulation", sub: "web-development", prereqs: ["javascript"] },
  { slug: "async-javascript", name: "Asynchronous JavaScript", sub: "web-development", prereqs: ["javascript"] },
  { slug: "typescript", name: "TypeScript", sub: "web-development", prereqs: ["javascript", "type-systems"] },
  { slug: "react", name: "React", sub: "web-development", prereqs: ["dom-manipulation", "async-javascript"] },
  { slug: "state-management", name: "State Management", sub: "web-development", prereqs: ["react"] },
  { slug: "nextjs", name: "Next.js", sub: "web-development", prereqs: ["react", "typescript"] },
  { slug: "nodejs", name: "Node.js", sub: "web-development", prereqs: ["async-javascript"] },
  { slug: "express", name: "Express.js", sub: "web-development", prereqs: ["nodejs"] },
  // A protocol, not a markup language. Requiring HTML put it on every backend path.
  { slug: "http-fundamentals", name: "HTTP Fundamentals", sub: "web-development" },
  // Deliberately not dependent on Express: REST is reachable from any server
  // language, and requiring one drags Node onto every backend path.
  { slug: "rest-api", name: "REST API Development", sub: "web-development", prereqs: ["http-fundamentals"] },
  { slug: "openapi", name: "OpenAPI Specification", sub: "web-development", prereqs: ["rest-api"] },
  { slug: "graphql", name: "GraphQL", sub: "web-development", prereqs: ["rest-api"] },
  { slug: "frontend-build-tooling", name: "Frontend Build Tooling", sub: "web-development", prereqs: ["javascript", "package-management"] },

  // ── Version Control ──────────────────────────────────────────────────
  { slug: "git", name: "Git", sub: "version-control", description: "Distributed version control. The baseline for working with anyone else." },
  { slug: "branching-merging", name: "Branching and Merging", sub: "version-control", prereqs: ["git"] },
  { slug: "merge-conflicts", name: "Merge Conflict Resolution", sub: "version-control", prereqs: ["branching-merging"] },
  { slug: "pull-requests", name: "Pull Requests", sub: "version-control", prereqs: ["branching-merging"] },
  { slug: "git-rebase", name: "Git Rebase", sub: "version-control", prereqs: ["merge-conflicts"] },
  { slug: "semantic-versioning", name: "Semantic Versioning", sub: "version-control", prereqs: ["git"] },
  { slug: "github-actions", name: "GitHub Actions", sub: "version-control", prereqs: ["pull-requests"] },

  // ── Databases ────────────────────────────────────────────────────────
  { slug: "sql", name: "SQL", sub: "databases", description: "Querying relational data." },
  { slug: "database-queries", name: "Database Queries", sub: "databases", prereqs: ["sql"] },
  { slug: "joins", name: "Joins and Aggregation", sub: "databases", prereqs: ["database-queries"] },
  { slug: "relational-modelling", name: "Relational Modelling", sub: "databases", prereqs: ["sql"] },
  { slug: "database-design", name: "Database Design", sub: "databases", prereqs: ["relational-modelling"] },
  { slug: "database-normalization", name: "Database Normalization", sub: "databases", prereqs: ["database-design"] },
  { slug: "indexing", name: "Indexing", sub: "databases", prereqs: ["joins"] },
  { slug: "query-optimization", name: "Query Optimization", sub: "databases", prereqs: ["indexing"] },
  { slug: "transactions", name: "Transactions", sub: "databases", prereqs: ["database-queries"] },
  { slug: "postgresql", name: "PostgreSQL", sub: "databases", prereqs: ["database-design", "transactions"] },
  { slug: "database-migrations", name: "Database Migrations", sub: "databases", prereqs: ["database-design", "git"] },
  { slug: "orm", name: "Object-Relational Mapping", sub: "databases", prereqs: ["relational-modelling", "oop"] },
  { slug: "nosql", name: "NoSQL", sub: "databases", prereqs: ["database-queries"] },
  { slug: "mongodb", name: "MongoDB", sub: "databases", prereqs: ["nosql"] },
  { slug: "redis", name: "Redis", sub: "databases", prereqs: ["nosql"] },
  { slug: "connection-pooling", name: "Connection Pooling", sub: "databases", prereqs: ["postgresql"] },
  { slug: "vector-databases", name: "Vector Databases", sub: "databases", prereqs: ["postgresql"] },

  // ── Data Analysis ────────────────────────────────────────────────────
  { slug: "numpy", name: "NumPy", sub: "data-analysis", prereqs: ["python", "data-structures"] },
  { slug: "pandas", name: "Pandas", sub: "data-analysis", prereqs: ["numpy"] },
  { slug: "jupyter", name: "Jupyter Notebook", sub: "data-analysis", prereqs: ["python"] },
  { slug: "data-cleaning", name: "Data Cleaning", sub: "data-analysis", prereqs: ["pandas"] },
  { slug: "exploratory-analysis", name: "Exploratory Data Analysis", sub: "data-analysis", prereqs: ["data-cleaning"] },
  { slug: "descriptive-statistics", name: "Descriptive Statistics", sub: "data-analysis", prereqs: ["numpy"] },
  { slug: "probability", name: "Probability", sub: "data-analysis", prereqs: ["descriptive-statistics"] },
  { slug: "hypothesis-testing", name: "Hypothesis Testing", sub: "data-analysis", prereqs: ["probability"] },
  { slug: "data-visualization", name: "Data Visualization", sub: "data-analysis", prereqs: ["exploratory-analysis"] },
  { slug: "matplotlib", name: "Matplotlib", sub: "data-analysis", prereqs: ["data-visualization"] },
  { slug: "sql-for-analytics", name: "SQL for Analytics", sub: "data-analysis", prereqs: ["joins"] },
  { slug: "time-series-analysis", name: "Time Series Analysis", sub: "data-analysis", prereqs: ["hypothesis-testing"] },
  { slug: "dashboarding", name: "Dashboarding", sub: "data-analysis", prereqs: ["data-visualization", "sql-for-analytics"] },

  // ── Machine Learning ─────────────────────────────────────────────────
  { slug: "supervised-learning", name: "Supervised Learning", sub: "machine-learning", prereqs: ["pandas", "probability"] },
  { slug: "unsupervised-learning", name: "Unsupervised Learning", sub: "machine-learning", prereqs: ["supervised-learning"] },
  { slug: "linear-regression", name: "Linear Regression", sub: "machine-learning", prereqs: ["supervised-learning"] },
  { slug: "logistic-regression", name: "Logistic Regression", sub: "machine-learning", prereqs: ["linear-regression"] },
  { slug: "decision-trees", name: "Decision Trees", sub: "machine-learning", prereqs: ["supervised-learning"] },
  { slug: "random-forest", name: "Random Forest", sub: "machine-learning", prereqs: ["decision-trees"] },
  { slug: "feature-engineering", name: "Feature Engineering", sub: "machine-learning", prereqs: ["data-cleaning", "supervised-learning"] },
  { slug: "model-evaluation", name: "Model Evaluation", sub: "machine-learning", prereqs: ["supervised-learning", "hypothesis-testing"] },
  { slug: "cross-validation", name: "Cross-Validation", sub: "machine-learning", prereqs: ["model-evaluation"] },
  { slug: "regularization", name: "Overfitting and Regularization", sub: "machine-learning", prereqs: ["model-evaluation"] },
  { slug: "gradient-descent", name: "Gradient Descent", sub: "machine-learning", prereqs: ["linear-regression"] },
  { slug: "scikit-learn", name: "Scikit-Learn", sub: "machine-learning", prereqs: ["feature-engineering", "cross-validation"] },
  { slug: "neural-networks", name: "Artificial Neural Networks", sub: "machine-learning", prereqs: ["gradient-descent", "regularization"] },
  { slug: "deep-learning", name: "Deep Learning", sub: "machine-learning", prereqs: ["neural-networks"] },
  { slug: "pytorch", name: "PyTorch", sub: "machine-learning", prereqs: ["deep-learning"] },
  { slug: "cnn", name: "Convolutional Neural Networks", sub: "machine-learning", prereqs: ["deep-learning"] },
  { slug: "nlp", name: "Natural Language Processing", sub: "machine-learning", prereqs: ["deep-learning"] },
  { slug: "transformers", name: "Transformer Architectures", sub: "machine-learning", prereqs: ["nlp"] },
  { slug: "llms", name: "Large Language Models", sub: "machine-learning", prereqs: ["transformers"] },
  { slug: "prompt-engineering", name: "Prompt Engineering", sub: "machine-learning", prereqs: ["llms"] },
  { slug: "rag", name: "Retrieval-Augmented Generation", sub: "machine-learning", prereqs: ["llms", "vector-databases"] },
  { slug: "model-deployment", name: "Model Deployment", sub: "machine-learning", prereqs: ["scikit-learn", "rest-api"] },
  { slug: "mlops", name: "MLOps", sub: "machine-learning", prereqs: ["model-deployment", "docker"] },

  // ── DevOps ───────────────────────────────────────────────────────────
  { slug: "linux-commands", name: "Linux Commands", sub: "devops", description: "Navigating and operating a Unix system from the shell." },
  { slug: "shell-scripting", name: "Shell Scripting", sub: "devops", prereqs: ["linux-commands"] },
  { slug: "file-permissions", name: "File Permissions", sub: "devops", prereqs: ["linux-commands"] },
  { slug: "process-management", name: "Process Management", sub: "devops", prereqs: ["linux-commands"] },
  { slug: "docker", name: "Docker", sub: "devops", prereqs: ["linux-commands", "process-management"] },
  { slug: "dockerfile", name: "Dockerfile Authoring", sub: "devops", prereqs: ["docker"] },
  { slug: "docker-compose", name: "Docker Compose", sub: "devops", prereqs: ["dockerfile"] },
  { slug: "container-networking", name: "Container Networking", sub: "devops", prereqs: ["docker-compose"] },
  { slug: "kubernetes", name: "Kubernetes", sub: "devops", prereqs: ["container-networking"] },
  { slug: "kubernetes-manifests", name: "Kubernetes Manifests", sub: "devops", prereqs: ["kubernetes"] },
  { slug: "continuous-integration", name: "Continuous Integration", sub: "devops", prereqs: ["github-actions", "unit-testing"] },
  { slug: "cicd", name: "CI/CD Pipelines", sub: "devops", prereqs: ["continuous-integration", "dockerfile"] },
  { slug: "infrastructure-as-code", name: "Infrastructure as Code", sub: "devops", prereqs: ["shell-scripting", "git"] },
  { slug: "terraform", name: "Terraform", sub: "devops", prereqs: ["infrastructure-as-code"] },
  { slug: "reverse-proxy", name: "Reverse Proxies", sub: "devops", prereqs: ["container-networking", "http-fundamentals"] },
  { slug: "monitoring-logging", name: "Monitoring and Logging", sub: "devops", prereqs: ["process-management"] },
  { slug: "deployment-strategies", name: "Deployment Strategies", sub: "devops", prereqs: ["cicd"] },

  // ── Cloud and Security ───────────────────────────────────────────────
  { slug: "cloud-fundamentals", name: "Cloud Computing Fundamentals", sub: "cloud-and-security", prereqs: ["linux-commands"] },
  { slug: "object-storage", name: "Object Storage", sub: "cloud-and-security", prereqs: ["cloud-fundamentals"] },
  { slug: "serverless", name: "Serverless Architecture", sub: "cloud-and-security", prereqs: ["cloud-fundamentals", "rest-api"] },
  { slug: "virtual-networks", name: "Virtual Networks", sub: "cloud-and-security", prereqs: ["cloud-fundamentals", "container-networking"] },
  { slug: "iam", name: "Identity and Access Management", sub: "cloud-and-security", prereqs: ["cloud-fundamentals"] },
  { slug: "secrets-management", name: "Secrets Management", sub: "cloud-and-security", prereqs: ["iam", "environment-configuration"] },
  { slug: "environment-configuration", name: "Environment Configuration", sub: "cloud-and-security", prereqs: ["shell-scripting"] },
  { slug: "https-tls", name: "HTTPS and TLS", sub: "cloud-and-security", prereqs: ["http-fundamentals"] },
  { slug: "data-encryption", name: "Data Encryption", sub: "cloud-and-security", prereqs: ["https-tls"] },
  { slug: "password-hashing", name: "Password Hashing", sub: "cloud-and-security", prereqs: ["data-encryption"] },
  { slug: "authentication", name: "Authentication", sub: "cloud-and-security", prereqs: ["password-hashing", "rest-api"] },
  { slug: "authorization", name: "Authorization", sub: "cloud-and-security", prereqs: ["authentication"] },
  { slug: "owasp-top-ten", name: "OWASP Top Ten", sub: "cloud-and-security", prereqs: ["authentication"] },
  { slug: "application-security", name: "Application Security", sub: "cloud-and-security", prereqs: ["owasp-top-ten"] },
  { slug: "sql-injection", name: "SQL Injection Prevention", sub: "cloud-and-security", prereqs: ["owasp-top-ten", "database-queries"] },
];
