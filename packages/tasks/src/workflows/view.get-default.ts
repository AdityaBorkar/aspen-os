import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object, optional } from "valibot";

import { savedView } from "../db-schemas/saved-view";
import { IdSchema } from "../types";

export const getDefaultSavedView = Workflow.name("view.get-default")
  .input(object({ ownerId: IdSchema, projectId: optional(IdSchema) }))
  .handler(async ({ ownerId, projectId }, ctx) => {
    return ctx.step.run("query", async () => {
      const conditions = [
        eq(savedView.ownerId, ownerId),
        eq(savedView.isDefault, true),
      ];

      if (projectId) {
        conditions.push(eq(savedView.projectId, projectId));
      }

      const [result] = await ctx.db
        .select()
        .from(savedView)
        .where(and(...conditions))
        .limit(1);

      return result ?? null;
    });
  });
