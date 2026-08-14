import { Workflow } from "@aspen-os/platform/server";
import { array, object } from "valibot";

import { buildDependencyGraph } from "../services/dependency-graph";
import type { TaskDependencyNode } from "../types";
import { IdSchema } from "../types";

export const getTaskLinkDependencyGraph = Workflow.name("link.dependency-graph")
  .input(object({ taskIds: array(IdSchema) }))
  .handler(async ({ taskIds }, ctx): Promise<TaskDependencyNode[]> =>
    ctx.step.run("query", async () => {
      return buildDependencyGraph(taskIds);
    }),
  );
