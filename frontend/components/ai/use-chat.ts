"use client";

import { useSyncExternalStore } from "react";

import { getServerSnapshot, getSnapshot, subscribe } from "./chat-store";

/**
 * One conversation, shared by the assistant page and the header sheet. The
 * store lives outside React so both mount against the same thread without a
 * provider wrapping the tree.
 */
export function useChat() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
