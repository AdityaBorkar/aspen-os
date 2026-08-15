import { buildDependencyGraph } from "#/services/dependency-graph";
import { IdSchema } from "#/types";
import type { TaskDependencyNode } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { array, object } from "valibot";

export const getTaskLinkDependencyGraph = Workflow.name("link.dependency-graph")
  .input(object({ taskIds: array(IdSchema) }))
  .handler(async ({ taskIds }, ctx): Promise<TaskDependencyNode[]> =>
    ctx.step.run("query", async () => buildDependencyGraph(taskIds)),
  );
