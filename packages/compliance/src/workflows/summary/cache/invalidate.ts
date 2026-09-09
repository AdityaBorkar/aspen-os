import { summaryKey, summaryPattern } from "#/workflows/summary/cache/keys";
import { getKvStore } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { object, optional, string } from "valibot";

const InvalidateInputSchema = object({
  branch: optional(string()),
});

const invalidateCache = Workflow.name("summary.invalidate-cache")
  .input(InvalidateInputSchema)
  .handler(async ({ branch }, ctx): Promise<void> => {
    const kvStore = getKvStore(ctx.config);
    if (!kvStore) {
      return;
    }
    if (branch) {
      await kvStore.del(summaryKey(branch));
      return;
    }
    if (kvStore.clear) {
      await kvStore.clear(summaryPattern());
      return;
    }
    await kvStore.del(summaryKey());
  });

export { invalidateCache };
