import { savedView } from "#/db-schemas/saved-view";
import { IdSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

export const listSavedViewsByProject = Workflow.name("view.list-by-project")
  .input(object({ projectId: IdSchema }))
  .handler(async ({ projectId }, ctx) =>
    ctx.step.run("query", async () =>
      ctx.db.select().from(savedView).where(eq(savedView.projectId, projectId)),
    ),
  );
