"use client";

import { useSyncExternalStore } from "react";

import { getServerSnapshot, getSnapshot, subscribe } from "./chat-store";

/**
 * One conversation per signed-in student, shared by the assistant page and
 * the header sheet. The store lives outside React so both mount against the
 * same thread without a provider wrapping the tree; `userId` is how it knows
 * whose thread that is, so switching accounts swaps it instead of leaking it.
 */
export function useChat(userId: string) {
  return useSyncExternalStore(
    (listener) => subscribe(userId, listener),
    getSnapshot,
    getServerSnapshot,
  );
}
