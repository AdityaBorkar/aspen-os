import { AsyncLocalStorage } from "node:async_hooks";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { PubSubModule } from "../modules/pubsub";

export const context = new AsyncLocalStorage<{
    db: NodePgDatabase<Record<string, never>>;
    pubsub: PubSubModule;
}>();

export function getContext() {
	const ctx = context.getStore();
	if (!ctx) throw new Error("Context was not initialized");
	return ctx;
}
