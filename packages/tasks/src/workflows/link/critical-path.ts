import { IdSchema } from "#/types";
import type { CriticalPathResult } from "#/types";
import { getCriticalPath } from "#/workflow-steps/dependency-graph";

import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

export const getTaskLinkCriticalPath = Workflow.name("link.critical-path")
  .input(object({ projectId: IdSchema }))
  .handler(async ({ projectId }, ctx): Promise<CriticalPathResult> =>
    ctx.step.run("query", async () => getCriticalPath(ctx.db, projectId)),
  );
