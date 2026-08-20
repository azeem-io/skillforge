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

export type ChatState = {
  messages: Message[];
  busy: boolean;
  /** The header sheet. Lives here so opening it from anywhere shows one thread. */
  open: boolean;
};

const STORAGE_KEY = "skillforge.assistant";
const EMPTY: ChatState = { messages: [], busy: false, open: false };

// Questions that need real numbers go to the agent, which can call the
// analyzer. Everything else takes the one-shot RAG path, which is far quicker.
const NEEDS_TOOLS =
  /\b(goal|role|career|switch|readiness|ready|gap|missing|roadmap|how long|weeks|next|compare|instead|my |i have|should i)\b/i;

let state: ChatState = EMPTY;
let hydrated = false;
let seq = 0;

const listeners = new Set<() => void>();

const id = () => `m${Date.now().toString(36)}${(seq++).toString(36)}`;

function emit() {
  for (const listener of listeners) listener();
}

function set(next: Partial<ChatState>) {
  state = { ...state, ...next };
  persist();
  emit();
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    // Only the settled turns. A pending bubble restored after a reload would be
    // a spinner nothing is ever going to fill.
    const messages = state.messages.filter((m) => !m.pending);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ messages }));
  } catch {
    // Private mode, or the quota is full. A lost transcript is not worth
    // breaking the conversation the student is having right now.
  }
}

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as { messages?: Message[] };
    if (Array.isArray(parsed.messages) && parsed.messages.length) {
      state = { ...state, messages: parsed.messages };
      emit();
    }
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
  }
}

export function subscribe(listener: () => void) {
  // Runs from an effect, so this is safely after hydration.
  hydrate();
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

export function reset() {
  state = { ...EMPTY, open: state.open };
  persist();
  emit();
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

  const settle = (patch: Partial<Message>) =>
    set({
      busy: false,
      messages: state.messages.map((m) =>
        m.id === placeholder ? { ...m, pending: false, ...patch } : m,
      ),
    });

  try {
    const response = await fetch(
      NEEDS_TOOLS.test(text) ? "/ai/agent" : "/ai/chat",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: text, history }),
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

export const SUGGESTIONS = [
  "What should I learn next?",
  "Why is my roadmap ordered this way?",
  "Which goal fits my skills best?",
  "How do I get better at NumPy?",
];
