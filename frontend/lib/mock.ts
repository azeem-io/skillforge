import type { Mastery } from "./mastery";

// Placeholder until skill-service is wired. Shapes match packages/db so the
// swap is a query change, not a refactor.

export type MockSkill = {
  id: string;
  name: string;
  subcategory: string;
  category: string;
  mastery: Mastery;
  level: number;
  requiredLevel: number;
  prerequisites: string[];
};

export const TARGET_ROLE = {
  name: "AI Engineer",
  summary:
    "Builds and ships machine-learning systems: data pipelines, model training, evaluation and serving.",
};

export const SKILLS: MockSkill[] = [
  { id: "python", name: "Python", subcategory: "Programming Languages", category: "Software Engineering", mastery: "mastered", level: 4, requiredLevel: 4, prerequisites: [] },
  { id: "git", name: "Git", subcategory: "Version Control", category: "Software Engineering", mastery: "mastered", level: 3, requiredLevel: 3, prerequisites: [] },
  { id: "html-css", name: "HTML and CSS", subcategory: "Web Development", category: "Software Engineering", mastery: "mastered", level: 3, requiredLevel: 2, prerequisites: [] },
  { id: "sql", name: "SQL", subcategory: "Databases", category: "Data and AI", mastery: "progress", level: 2, requiredLevel: 4, prerequisites: [] },
  { id: "rest-api", name: "REST API Development", subcategory: "Web Development", category: "Software Engineering", mastery: "progress", level: 2, requiredLevel: 3, prerequisites: ["html-css"] },
  { id: "pandas", name: "Pandas", subcategory: "Data Analysis", category: "Data and AI", mastery: "progress", level: 2, requiredLevel: 4, prerequisites: ["python"] },
  { id: "numpy", name: "NumPy", subcategory: "Data Analysis", category: "Data and AI", mastery: "gap", level: 0, requiredLevel: 3, prerequisites: ["python"] },
  { id: "db-design", name: "Database Design", subcategory: "Databases", category: "Data and AI", mastery: "gap", level: 0, requiredLevel: 3, prerequisites: ["sql"] },
  { id: "linear-regression", name: "Linear Regression", subcategory: "Machine Learning", category: "Data and AI", mastery: "gap", level: 0, requiredLevel: 4, prerequisites: ["numpy", "pandas"] },
  { id: "feature-engineering", name: "Feature Engineering", subcategory: "Machine Learning", category: "Data and AI", mastery: "gap", level: 0, requiredLevel: 4, prerequisites: ["pandas"] },
  { id: "scikit-learn", name: "Scikit-Learn", subcategory: "Machine Learning", category: "Data and AI", mastery: "locked", level: 0, requiredLevel: 4, prerequisites: ["linear-regression", "feature-engineering"] },
  { id: "neural-networks", name: "Artificial Neural Networks", subcategory: "Machine Learning", category: "Data and AI", mastery: "locked", level: 0, requiredLevel: 4, prerequisites: ["scikit-learn"] },
  { id: "docker", name: "Docker", subcategory: "DevOps", category: "Infrastructure", mastery: "gap", level: 0, requiredLevel: 3, prerequisites: ["git"] },
  { id: "mlops", name: "MLOps", subcategory: "DevOps", category: "Infrastructure", mastery: "locked", level: 0, requiredLevel: 3, prerequisites: ["docker", "scikit-learn"] },
];

export const SKILL_BY_ID = new Map(SKILLS.map((s) => [s.id, s]));

export const READINESS = Math.round(
  (SKILLS.reduce((acc, s) => acc + Math.min(s.level, s.requiredLevel), 0) /
    SKILLS.reduce((acc, s) => acc + s.requiredLevel, 0)) *
    100,
);

export const DUE_FOR_REVIEW = SKILLS.filter(
  (s) => s.mastery === "mastered",
).slice(0, 2);

export type MockPhase = {
  phase: number;
  title: string;
  rationale: string;
  estimatedWeeks: number;
  skillIds: string[];
};

// Ordering here stands in for RoadmapGenerator.topological_layers(); rationale
// text stands in for the LLM's only contribution.
export const ROADMAP: MockPhase[] = [
  {
    phase: 1,
    title: "Close the data foundations",
    rationale:
      "NumPy and database design unblock everything downstream and depend only on skills you already hold.",
    estimatedWeeks: 3,
    skillIds: ["numpy", "db-design", "docker"],
  },
  {
    phase: 2,
    title: "Build modelling fundamentals",
    rationale:
      "Both require Pandas and NumPy, and together they are the prerequisite pair for Scikit-Learn.",
    estimatedWeeks: 4,
    skillIds: ["linear-regression", "feature-engineering"],
  },
  {
    phase: 3,
    title: "Apply and deploy",
    rationale:
      "Scikit-Learn becomes reachable once Phase 2 lands; MLOps then combines it with Docker.",
    estimatedWeeks: 5,
    skillIds: ["scikit-learn", "neural-networks", "mlops"],
  },
];
