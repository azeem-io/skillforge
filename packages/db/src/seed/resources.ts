export type SeedResource = {
  skill: string;
  title: string;
  type: "course" | "article" | "video" | "book" | "project" | "documentation";
  provider?: string;
  url?: string;
  summary?: string;
};

// URLs are only set where the canonical page is stable. Project rows are
// deliberately URL-less: they are briefs, and they feed the Projects stage of
// the roadmap pipeline.
export const RESOURCES: SeedResource[] = [
  { skill: "python", title: "The Python Tutorial", type: "documentation", provider: "Python Software Foundation", url: "https://docs.python.org/3/tutorial/" },
  { skill: "python", title: "Build a command-line todo tracker", type: "project", summary: "File I/O, argument parsing and a persistent data format, with no framework to hide behind." },
  { skill: "oop", title: "Model a library catalogue with classes", type: "project", summary: "Books, members and loans. Get the invariants into the types rather than the call sites." },
  { skill: "unit-testing", title: "pytest documentation", type: "documentation", provider: "pytest", url: "https://docs.pytest.org/" },
  { skill: "algorithms", title: "Implement sorting and searching from scratch", type: "project", summary: "Then measure them. The point is the measurement, not the implementation." },

  { skill: "html", title: "HTML: HyperText Markup Language", type: "documentation", provider: "MDN", url: "https://developer.mozilla.org/en-US/docs/Web/HTML" },
  { skill: "css", title: "CSS: Cascading Style Sheets", type: "documentation", provider: "MDN", url: "https://developer.mozilla.org/en-US/docs/Web/CSS" },
  { skill: "responsive-design", title: "Rebuild a news homepage at three breakpoints", type: "project", summary: "No framework. Grid, flexbox and container queries only." },
  { skill: "web-accessibility", title: "WAI-ARIA Authoring Practices", type: "documentation", provider: "W3C", url: "https://www.w3.org/WAI/ARIA/apg/" },
  { skill: "javascript", title: "JavaScript Guide", type: "documentation", provider: "MDN", url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide" },
  { skill: "async-javascript", title: "Fetch and render a paginated API", type: "project", summary: "Loading, error and empty states included — those are the hard parts." },
  { skill: "typescript", title: "TypeScript Handbook", type: "documentation", provider: "Microsoft", url: "https://www.typescriptlang.org/docs/handbook/intro.html" },
  { skill: "react", title: "React documentation", type: "documentation", provider: "Meta", url: "https://react.dev/learn" },
  { skill: "react", title: "Build a filterable product grid", type: "project", summary: "Derived state, controlled inputs, and no unnecessary re-renders." },
  { skill: "nextjs", title: "Next.js App Router", type: "documentation", provider: "Vercel", url: "https://nextjs.org/docs/app" },
  { skill: "rest-api", title: "Build a bookmarking API", type: "project", summary: "CRUD, validation at the boundary, pagination and honest status codes." },
  { skill: "openapi", title: "OpenAPI Specification", type: "documentation", provider: "OpenAPI Initiative", url: "https://spec.openapis.org/oas/latest.html" },

  { skill: "git", title: "Pro Git", type: "book", provider: "Chacon & Straub", url: "https://git-scm.com/book/en/v2" },
  { skill: "branching-merging", title: "Recover from a bad merge, deliberately", type: "project", summary: "Break a branch on purpose, then fix it with reflog and reset." },
  { skill: "github-actions", title: "GitHub Actions documentation", type: "documentation", provider: "GitHub", url: "https://docs.github.com/en/actions" },

  { skill: "sql", title: "PostgreSQL Tutorial", type: "documentation", provider: "PostgreSQL", url: "https://www.postgresql.org/docs/current/tutorial.html" },
  { skill: "database-design", title: "Design a schema for a small booking system", type: "project", summary: "Then write the query that would be slow, and the index that fixes it." },
  { skill: "indexing", title: "Indexes in PostgreSQL", type: "documentation", provider: "PostgreSQL", url: "https://www.postgresql.org/docs/current/indexes.html" },
  { skill: "postgresql", title: "PostgreSQL documentation", type: "documentation", provider: "PostgreSQL", url: "https://www.postgresql.org/docs/current/" },
  { skill: "vector-databases", title: "pgvector", type: "documentation", provider: "pgvector", url: "https://github.com/pgvector/pgvector" },

  { skill: "numpy", title: "NumPy user guide", type: "documentation", provider: "NumPy", url: "https://numpy.org/doc/stable/user/" },
  { skill: "pandas", title: "10 minutes to pandas", type: "documentation", provider: "pandas", url: "https://pandas.pydata.org/docs/user_guide/10min.html" },
  { skill: "data-cleaning", title: "Clean a real messy dataset end to end", type: "project", summary: "Missing values, duplicates, inconsistent categories. Document every judgement call." },
  { skill: "exploratory-analysis", title: "Profile a dataset you have never seen", type: "project", summary: "Write down five questions first, then answer them with plots." },
  { skill: "data-visualization", title: "Matplotlib tutorials", type: "documentation", provider: "Matplotlib", url: "https://matplotlib.org/stable/tutorials/" },

  { skill: "supervised-learning", title: "Scikit-Learn: supervised learning", type: "documentation", provider: "scikit-learn", url: "https://scikit-learn.org/stable/supervised_learning.html" },
  { skill: "model-evaluation", title: "Metrics and scoring", type: "documentation", provider: "scikit-learn", url: "https://scikit-learn.org/stable/modules/model_evaluation.html" },
  { skill: "model-evaluation", title: "Break your own model", type: "project", summary: "Build a classifier that scores well and then find the split where it fails." },
  { skill: "feature-engineering", title: "Predict from tabular data without a neural network", type: "project", summary: "Feature work first. Only then reach for a bigger model." },
  { skill: "scikit-learn", title: "Scikit-Learn user guide", type: "documentation", provider: "scikit-learn", url: "https://scikit-learn.org/stable/user_guide.html" },
  { skill: "neural-networks", title: "Implement a two-layer network with NumPy", type: "project", summary: "Forward pass, backward pass, gradient descent. No framework." },
  { skill: "pytorch", title: "PyTorch tutorials", type: "documentation", provider: "PyTorch", url: "https://pytorch.org/tutorials/" },
  { skill: "llms", title: "Large language models", type: "article", provider: "Hugging Face", url: "https://huggingface.co/docs/transformers/llm_tutorial" },
  { skill: "rag", title: "Build a question-answering bot over your own notes", type: "project", summary: "Chunk, embed, retrieve, then ground the answer. Show the sources." },
  { skill: "model-deployment", title: "Serve a model behind a FastAPI endpoint", type: "project", summary: "Input validation, a health check, and a container that starts cold." },
  { skill: "mlops", title: "Version a model and its data together", type: "project", summary: "Retraining should be reproducible from a commit hash." },

  { skill: "linux-commands", title: "The Linux Command Line", type: "book", provider: "William Shotts", url: "https://linuxcommand.org/tlcl.php" },
  { skill: "shell-scripting", title: "Automate your own dev setup", type: "project", summary: "Idempotent. Running it twice should be safe." },
  { skill: "docker", title: "Docker documentation", type: "documentation", provider: "Docker", url: "https://docs.docker.com/" },
  { skill: "dockerfile", title: "Containerise an app you already wrote", type: "project", summary: "Multi-stage, non-root user, and an image under 200MB." },
  { skill: "docker-compose", title: "Compose file reference", type: "documentation", provider: "Docker", url: "https://docs.docker.com/compose/compose-file/" },
  { skill: "kubernetes", title: "Kubernetes documentation", type: "documentation", provider: "CNCF", url: "https://kubernetes.io/docs/home/" },
  { skill: "kubernetes-manifests", title: "Deploy a two-service app to a local cluster", type: "project", summary: "Deployment, Service, ConfigMap. Then delete a pod and watch it come back." },
  { skill: "cicd", title: "Build a pipeline that blocks a bad merge", type: "project", summary: "Lint, typecheck, test, build. It should fail loudly and fast." },
  { skill: "terraform", title: "Terraform documentation", type: "documentation", provider: "HashiCorp", url: "https://developer.hashicorp.com/terraform/docs" },
  { skill: "monitoring-logging", title: "Add structured logging and one real alert", type: "project", summary: "An alert nobody acts on is worse than no alert." },

  { skill: "https-tls", title: "Transport Layer Security", type: "documentation", provider: "MDN", url: "https://developer.mozilla.org/en-US/docs/Web/Security/Transport_Layer_Security" },
  { skill: "password-hashing", title: "Password Storage Cheat Sheet", type: "article", provider: "OWASP", url: "https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html" },
  { skill: "authentication", title: "Implement sessions without a library", type: "project", summary: "Then read the library you would have used and list what you missed." },
  { skill: "owasp-top-ten", title: "OWASP Top Ten", type: "documentation", provider: "OWASP", url: "https://owasp.org/www-project-top-ten/" },
  { skill: "secrets-management", title: "Remove a secret from git history", type: "project", summary: "Rotate it too. Deleting the commit is not enough." },
];
