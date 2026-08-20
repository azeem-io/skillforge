export type SeedRequirement = {
  skill: string;
  level: number;
  weight: number;
};

export type SeedRole = {
  slug: string;
  name: string;
  summary: string;
  description: string;
  requirements: SeedRequirement[];
};

export const ROLES: SeedRole[] = [
  {
    slug: "ai-engineer",
    name: "AI Engineer",
    summary:
      "Builds and ships machine-learning systems: data pipelines, model training, evaluation and serving.",
    description:
      "Sits between data science and backend engineering. Expected to train a model, judge honestly whether it works, and put it behind an API that survives production.",
    requirements: [
      { skill: "python", level: 5, weight: 5 },
      { skill: "oop", level: 4, weight: 3 },
      { skill: "unit-testing", level: 3, weight: 3 },
      { skill: "git", level: 4, weight: 4 },
      { skill: "numpy", level: 4, weight: 5 },
      { skill: "pandas", level: 4, weight: 5 },
      { skill: "data-cleaning", level: 4, weight: 4 },
      { skill: "descriptive-statistics", level: 4, weight: 4 },
      { skill: "probability", level: 4, weight: 4 },
      { skill: "supervised-learning", level: 5, weight: 5 },
      { skill: "feature-engineering", level: 4, weight: 5 },
      { skill: "model-evaluation", level: 5, weight: 5 },
      { skill: "cross-validation", level: 4, weight: 4 },
      { skill: "regularization", level: 4, weight: 4 },
      { skill: "scikit-learn", level: 4, weight: 5 },
      { skill: "neural-networks", level: 4, weight: 4 },
      { skill: "deep-learning", level: 3, weight: 3 },
      { skill: "pytorch", level: 3, weight: 3 },
      { skill: "sql", level: 3, weight: 3 },
      { skill: "rest-api", level: 3, weight: 4 },
      { skill: "model-deployment", level: 4, weight: 5 },
      { skill: "docker", level: 3, weight: 4 },
      { skill: "mlops", level: 3, weight: 4 },
    ],
  },
  {
    slug: "frontend-engineer",
    name: "Frontend Engineer",
    summary:
      "Builds accessible, responsive interfaces and the client-side state behind them.",
    description:
      "Owns what the user actually touches. Judged on how the interface behaves on a slow connection, a small screen and a keyboard.",
    requirements: [
      { skill: "html", level: 5, weight: 5 },
      { skill: "css", level: 5, weight: 5 },
      { skill: "responsive-design", level: 4, weight: 5 },
      { skill: "web-accessibility", level: 4, weight: 4 },
      { skill: "javascript", level: 5, weight: 5 },
      { skill: "dom-manipulation", level: 4, weight: 4 },
      { skill: "async-javascript", level: 4, weight: 4 },
      { skill: "typescript", level: 4, weight: 4 },
      { skill: "react", level: 5, weight: 5 },
      { skill: "state-management", level: 4, weight: 4 },
      { skill: "nextjs", level: 4, weight: 4 },
      { skill: "frontend-build-tooling", level: 3, weight: 3 },
      { skill: "http-fundamentals", level: 3, weight: 3 },
      { skill: "rest-api", level: 3, weight: 3 },
      { skill: "git", level: 4, weight: 4 },
      { skill: "branching-merging", level: 3, weight: 3 },
      { skill: "pull-requests", level: 3, weight: 3 },
      { skill: "unit-testing", level: 3, weight: 3 },
    ],
  },
  {
    slug: "backend-engineer",
    name: "Backend Engineer",
    summary:
      "Designs data models and the APIs over them, with an eye on correctness under load.",
    description:
      "Owns the data and the contracts. Expected to model a domain properly, keep queries fast, and not leak anything.",
    requirements: [
      { skill: "python", level: 4, weight: 4 },
      { skill: "oop", level: 4, weight: 4 },
      { skill: "error-handling", level: 4, weight: 4 },
      { skill: "unit-testing", level: 4, weight: 4 },
      { skill: "algorithms", level: 3, weight: 3 },
      { skill: "sql", level: 5, weight: 5 },
      { skill: "relational-modelling", level: 4, weight: 5 },
      { skill: "database-design", level: 4, weight: 5 },
      { skill: "database-normalization", level: 4, weight: 4 },
      { skill: "joins", level: 4, weight: 4 },
      { skill: "indexing", level: 4, weight: 4 },
      { skill: "query-optimization", level: 3, weight: 4 },
      { skill: "transactions", level: 4, weight: 4 },
      { skill: "postgresql", level: 4, weight: 4 },
      { skill: "database-migrations", level: 3, weight: 3 },
      { skill: "orm", level: 3, weight: 3 },
      { skill: "http-fundamentals", level: 4, weight: 4 },
      { skill: "rest-api", level: 5, weight: 5 },
      { skill: "openapi", level: 3, weight: 3 },
      { skill: "authentication", level: 4, weight: 5 },
      { skill: "authorization", level: 4, weight: 5 },
      { skill: "password-hashing", level: 3, weight: 4 },
      { skill: "sql-injection", level: 3, weight: 4 },
      { skill: "git", level: 4, weight: 4 },
      { skill: "docker", level: 3, weight: 3 },
    ],
  },
  {
    slug: "devops-engineer",
    name: "DevOps Engineer",
    summary:
      "Automates the path from commit to production and keeps it observable.",
    description:
      "Owns the pipeline and the infrastructure under it. Expected to make deploys boring and failures visible.",
    requirements: [
      { skill: "linux-commands", level: 5, weight: 5 },
      { skill: "shell-scripting", level: 4, weight: 5 },
      { skill: "file-permissions", level: 4, weight: 4 },
      { skill: "process-management", level: 4, weight: 4 },
      { skill: "git", level: 4, weight: 4 },
      { skill: "branching-merging", level: 3, weight: 3 },
      { skill: "github-actions", level: 4, weight: 4 },
      { skill: "docker", level: 5, weight: 5 },
      { skill: "dockerfile", level: 5, weight: 5 },
      { skill: "docker-compose", level: 4, weight: 4 },
      { skill: "container-networking", level: 4, weight: 4 },
      { skill: "kubernetes", level: 4, weight: 5 },
      { skill: "kubernetes-manifests", level: 4, weight: 5 },
      { skill: "continuous-integration", level: 4, weight: 4 },
      { skill: "cicd", level: 5, weight: 5 },
      { skill: "infrastructure-as-code", level: 4, weight: 5 },
      { skill: "terraform", level: 4, weight: 5 },
      { skill: "reverse-proxy", level: 3, weight: 3 },
      { skill: "monitoring-logging", level: 4, weight: 4 },
      { skill: "deployment-strategies", level: 4, weight: 4 },
      { skill: "cloud-fundamentals", level: 4, weight: 4 },
      { skill: "virtual-networks", level: 3, weight: 3 },
      { skill: "iam", level: 3, weight: 4 },
      { skill: "secrets-management", level: 4, weight: 5 },
      { skill: "environment-configuration", level: 4, weight: 4 },
      { skill: "https-tls", level: 3, weight: 3 },
    ],
  },
];
