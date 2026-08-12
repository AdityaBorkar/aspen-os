import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object } from "valibot";

import { savedView } from "../db-schemas/saved-view";
import { IdSchema } from "../types";

export const listSharedSavedViews = Workflow.name("view.list-shared")
  .input(object({ projectId: IdSchema }))
  .handler(async ({ projectId }, ctx) => {
    return ctx.step.run("query", async () => {
      return ctx.db
        .select()
        .from(savedView)
        .where(
          and(eq(savedView.projectId, projectId), eq(savedView.isShared, true)),
        );
    });
  });
