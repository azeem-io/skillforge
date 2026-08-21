"use client";

export type Source = { source: string; relevance: number };
export type Step = { tool: string };

export type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  steps?: Step[];
  pending?: boolean;
  failed?: boolean;
};

export type Thread = {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: number;
};

export type ChatState = {
  messages: Message[];
  /** Past conversations, newest first. Does not include the active one. */
  threads: Thread[];
  busy: boolean;
  /** The header sheet. Lives here so opening it from anywhere shows one thread. */
  open: boolean;
};

// Bucketed per signed-in student, not a single global key: two accounts in the
// same browser (sign out, sign in as someone else, no full reload) must never
// share a transcript. The pre-scoping key this replaced is purged on first
// contact with any account, since it may already hold a leaked conversation.
const LEGACY_STORAGE_KEY = "skillforge.assistant";
const storageKey = (userId: string) => `skillforge.assistant.${userId}`;
const EMPTY: ChatState = { messages: [], threads: [], busy: false, open: false };
const MAX_THREADS = 20;

// Questions that need real numbers go to the agent, which can call the
// analyzer. Everything else takes the one-shot RAG path, which is far quicker.
const NEEDS_TOOLS =
  /\b(goal|role|career|switch|readiness|ready|gap|missing|roadmap|how long|weeks|next|compare|instead|my |i have|should i)\b/i;

let state: ChatState = EMPTY;
let currentUserId: string | null = null;
let currentThreadId = "";
let seq = 0;

const listeners = new Set<() => void>();

const id = () => `m${Date.now().toString(36)}${(seq++).toString(36)}`;

function titleFor(messages: Message[]): string {
  const question = messages.find((m) => m.role === "user")?.content.trim();
  if (!question) return "New chat";
  return question.length > 48 ? `${question.slice(0, 48)}…` : question;
}

function emit() {
  for (const listener of listeners) listener();
}

function set(next: Partial<ChatState>) {
  state = { ...state, ...next };
  persist();
  emit();
}

function persist() {
  if (typeof window === "undefined" || !currentUserId) return;
  try {
    // Only the settled turns. A pending bubble restored after a reload would be
    // a spinner nothing is ever going to fill.
    const messages = state.messages.filter((m) => !m.pending);
    const current: Thread = {
      id: currentThreadId,
      title: titleFor(messages),
      messages,
      updatedAt: Date.now(),
    };
    window.localStorage.setItem(
      storageKey(currentUserId),
      JSON.stringify({ current, threads: state.threads }),
    );
  } catch {
    // Private mode, or the quota is full. A lost transcript is not worth
    // breaking the conversation the student is having right now.
  }
}

/**
 * Loads the calling student's own bucket, discarding whatever was in memory
 * for a previous one. A no-op when already on that student's bucket, so
 * repeated subscriptions from the same account don't stomp an in-flight turn.
 */
function ensureUser(userId: string) {
  if (currentUserId === userId) return;
  currentUserId = userId;
  currentThreadId = id();
  state = { ...EMPTY, open: state.open };
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(LEGACY_STORAGE_KEY);
    const raw = window.localStorage.getItem(storageKey(userId));
    if (!raw) return;
    const parsed = JSON.parse(raw) as {
      current?: Thread;
      threads?: Thread[];
    };
    if (parsed.current?.id && Array.isArray(parsed.current.messages)) {
      currentThreadId = parsed.current.id;
      state = { ...state, messages: parsed.current.messages };
    }
    if (Array.isArray(parsed.threads)) {
      state = { ...state, threads: parsed.threads.slice(0, MAX_THREADS) };
    }
  } catch {
    window.localStorage.removeItem(storageKey(userId));
  }
}

export function subscribe(userId: string, listener: () => void) {
  // Runs from an effect, so this is safely after mount.
  ensureUser(userId);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export const getSnapshot = () => state;
export const getServerSnapshot = () => EMPTY;

export function setOpen(open: boolean) {
  set({ open });
}

/** Archives the current thread (if it has anything in it) and starts a fresh one. */
export function reset() {
  const settled = state.messages.filter((m) => !m.pending && m.content);
  const threads = settled.length
    ? [
        {
          id: currentThreadId,
          title: titleFor(settled),
          messages: settled,
          updatedAt: Date.now(),
        },
        ...state.threads,
      ].slice(0, MAX_THREADS)
    : state.threads;

  currentThreadId = id();
  state = { ...EMPTY, open: state.open, threads };
  persist();
  emit();
}

/** Swaps in a past thread, archiving whatever is currently open. */
export function switchTo(threadId: string) {
  if (state.busy || threadId === currentThreadId) return;
  const target = state.threads.find((t) => t.id === threadId);
  if (!target) return;

  const settled = state.messages.filter((m) => !m.pending && m.content);
  const archivedCurrent = settled.length
    ? [
        {
          id: currentThreadId,
          title: titleFor(settled),
          messages: settled,
          updatedAt: Date.now(),
        },
      ]
    : [];

  currentThreadId = target.id;
  state = {
    ...state,
    messages: target.messages,
    threads: [...archivedCurrent, ...state.threads.filter((t) => t.id !== threadId)].slice(
      0,
      MAX_THREADS,
    ),
  };
  persist();
  emit();
}

export function clearThreads() {
  state = { ...state, threads: [] };
  persist();
  emit();
}

async function ask(
  question: string,
  history: { role: string; content: string }[],
  targetId: string,
) {
  const settle = (patch: Partial<Message>) =>
    set({
      busy: false,
      messages: state.messages.map((m) =>
        m.id === targetId ? { ...m, pending: false, ...patch } : m,
      ),
    });

  try {
    const response = await fetch(
      NEEDS_TOOLS.test(question) ? "/ai/agent" : "/ai/chat",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question, history }),
      },
    );
    const data = await response.json();

    if (!response.ok) {
      settle({
        failed: true,
        content: data.hint ?? data.error ?? "The assistant could not answer.",
      });
      return;
    }

    settle({
      content: data.answer || "No answer came back.",
      sources: data.sources ?? [],
      steps: data.steps ?? [],
    });
  } catch (error) {
    settle({
      failed: true,
      content:
        error instanceof Error
          ? error.message
          : "The assistant could not answer.",
    });
  }
}

export async function send(question: string) {
  const text = question.trim();
  if (!text || state.busy) return;

  // Captured before the new turn lands, so the model is not shown the question
  // it is being asked twice.
  const history = state.messages
    .filter((m) => !m.pending && !m.failed && m.content)
    .map((m) => ({ role: m.role, content: m.content }));

  const placeholder = id();
  set({
    busy: true,
    messages: [
      ...state.messages,
      { id: id(), role: "user", content: text },
      { id: placeholder, role: "assistant", content: "", pending: true },
    ],
  });

  await ask(text, history, placeholder);
}

/** Re-asks a failed turn's own question in place, rather than appending a duplicate. */
export async function retry(messageId: string) {
  if (state.busy) return;
  const targetIndex = state.messages.findIndex((m) => m.id === messageId);
  const target = state.messages[targetIndex];
  if (!target || target.role !== "assistant" || !target.failed) return;

  let questionIndex = -1;
  for (let i = targetIndex - 1; i >= 0; i--) {
    if (state.messages[i].role === "user") {
      questionIndex = i;
      break;
    }
  }
  if (questionIndex === -1) return;
  const question = state.messages[questionIndex].content;

  const history = state.messages
    .slice(0, questionIndex)
    .filter((m) => !m.pending && !m.failed && m.content)
    .map((m) => ({ role: m.role, content: m.content }));

  set({
    busy: true,
    messages: state.messages.map((m) =>
      m.id === messageId
        ? { ...m, pending: true, failed: false, content: "" }
        : m,
    ),
  });

  await ask(question, history, messageId);
}

export const SUGGESTIONS = [
  "What should I learn next?",
  "Why is my roadmap ordered this way?",
  "Which goal fits my skills best?",
  "How do I get better at NumPy?",
];
