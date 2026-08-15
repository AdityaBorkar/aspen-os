import { savedView } from "#/db-schemas/saved-view";
import { IdSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object } from "valibot";

export const listSharedSavedViews = Workflow.name("view.list-shared")
  .input(object({ projectId: IdSchema }))
  .handler(async ({ projectId }, ctx) =>
    ctx.step.run("query", async () =>
      ctx.db
        .select()
        .from(savedView)
        .where(and(eq(savedView.projectId, projectId), eq(savedView.isShared, true))),
    ),
  );
