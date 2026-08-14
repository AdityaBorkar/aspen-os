import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

import { getCriticalPath } from "../services/dependency-graph";
import { type CriticalPathResult, IdSchema } from "../types";

export const getTaskLinkCriticalPath = Workflow.name("link.critical-path")
  .input(object({ projectId: IdSchema }))
  .handler(async ({ projectId }, ctx): Promise<CriticalPathResult> =>
    ctx.step.run("query", async () => getCriticalPath(projectId)),
  );
