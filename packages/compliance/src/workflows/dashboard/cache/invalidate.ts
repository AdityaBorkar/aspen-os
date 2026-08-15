import { Workflow } from "@aspen-os/platform/server";

const CACHE_KEY = "compliance:dashboard:summary";

const invalidateCache = Workflow.name("dashboard.invalidate-cache").handler(
  async (_input: Record<string, never>, ctx): Promise<void> => {
    const kvStore = ctx.config.kvStore as { del: (key: string) => Promise<void> } | undefined;
    if (!kvStore) {
      return;
    }
    await kvStore.del(CACHE_KEY);
  },
);

export { invalidateCache };
