import type { UseChatHelpers } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import { createContext, use, useEffect, useEffectEvent } from "react";

export type ChatUIMessage = UIMessage<
  never,
  {
    client: {
      location: string;
    };
  }
>;

export const Context = createContext<{
  open: boolean;
  setOpen: (open: boolean) => void;
  chat: UseChatHelpers<ChatUIMessage>;
} | null>(null);

export function useAISearchContext() {
  const ctx = use(Context);
  if (!ctx) {
    throw new Error("useAISearchContext must be used within an AISearch");
  }
  return ctx;
}

export function useChatContext() {
  return use(Context)?.chat;
}

export function useHotKey() {
  const { open, setOpen } = useAISearchContext();

  const onKeyPress = useEffectEvent((e: KeyboardEvent) => {
    if (e.key === "Escape" && open) {
      setOpen(false);
      e.preventDefault();
    }

    if (e.key === "/" && (e.metaKey || e.ctrlKey) && !open) {
      setOpen(true);
      e.preventDefault();
    }
  });

  useEffect(() => {
    window.addEventListener("keydown", onKeyPress);
    return () => window.removeEventListener("keydown", onKeyPress);
  }, []);
}
