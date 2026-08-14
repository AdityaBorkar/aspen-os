import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

import { savedView } from "../db-schemas/saved-view";
import { IdSchema } from "../types";

export const listSavedViewsByProject = Workflow.name("view.list-by-project")
  .input(object({ projectId: IdSchema }))
  .handler(async ({ projectId }, ctx) =>
    ctx.step.run("query", async () => {
      return ctx.db.select().from(savedView).where(eq(savedView.projectId, projectId));
    }),
  );
