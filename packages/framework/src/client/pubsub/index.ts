import type { PubSubConfig } from "./types";

export type { PubSubConfig } from "./types";

export class PubSubUnit {
  readonly name = "pubsub" as const;

  constructor(_config: PubSubConfig, _deps?: { db?: unknown }) {
    throw new Error(
      "PubSubUnit is not supported on the client side. Use server-side framework instead.",
    );
  }

  async prepare(): Promise<void> {
    throw new Error("PubSubUnit is not supported on the client side.");
  }

  async destroy(): Promise<void> {
    throw new Error("PubSubUnit is not supported on the client side.");
  }

  async healthCheck(): Promise<boolean> {
    return false;
  }

  async getQueueSize(_topic: string): Promise<number> {
    throw new Error("PubSubUnit is not supported on the client side.");
  }

  async publish<T = unknown>(
    _topic: string,
    _data: T,
    _options?: unknown,
  ): Promise<string> {
    throw new Error("PubSubUnit is not supported on the client side.");
  }

  async publishBatch<T = unknown>(
    _topic: string,
    _messages: { data: T; options?: unknown }[],
  ): Promise<string[]> {
    throw new Error("PubSubUnit is not supported on the client side.");
  }

  async purgeQueue(_topic: string): Promise<void> {
    throw new Error("PubSubUnit is not supported on the client side.");
  }

  async subscribe<_T = unknown>(
    _topic: string,
    _handler: (message: unknown) => Promise<void>,
  ): Promise<void> {
    throw new Error("PubSubUnit is not supported on the client side.");
  }

  async unsubscribe(_topic: string): Promise<void> {
    throw new Error("PubSubUnit is not supported on the client side.");
  }
}
