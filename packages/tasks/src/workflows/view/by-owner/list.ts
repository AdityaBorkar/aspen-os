import { savedView } from "#/db-schemas/saved-view";
import { IdSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

export const listSavedViewsByOwner = Workflow.name("view.list-by-owner")
  .input(object({ ownerId: IdSchema }))
  .handler(async ({ ownerId }, ctx) =>
    ctx.step.run("query", async () =>
      ctx.db.select().from(savedView).where(eq(savedView.ownerId, ownerId)),
    ),
  );
