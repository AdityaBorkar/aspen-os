import { dashboardSummaryKey, dashboardSummaryPattern } from "#/workflows/dashboard/cache/keys";
import { getKvStore } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { object, optional, string } from "valibot";

const InvalidateInputSchema = object({
  branch: optional(string()),
});

const invalidateCache = Workflow.name("dashboard.invalidate-cache")
  .input(InvalidateInputSchema)
  .handler(async ({ branch }, ctx): Promise<void> => {
    const kvStore = getKvStore(ctx.config);
    if (!kvStore) {
      return;
    }
    if (branch) {
      await kvStore.del(dashboardSummaryKey(branch));
      return;
    }
    if (kvStore.clear) {
      await kvStore.clear(dashboardSummaryPattern());
      return;
    }
    await kvStore.del(dashboardSummaryKey());
  });

export { invalidateCache };
