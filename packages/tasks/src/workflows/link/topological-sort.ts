import { Workflow } from "@aspen-os/platform/server";
import { array, object } from "valibot";

import { topologicalSort } from "../../services/dependency-graph";
import { IdSchema } from "../../types";

export const topologicalSortTasks = Workflow.name("link.topological-sort")
  .input(object({ taskIds: array(IdSchema) }))
  .handler(async ({ taskIds }, ctx): Promise<string[]> =>
    ctx.step.run("query", async () => topologicalSort(taskIds)),
  );
