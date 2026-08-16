import { workspaceView } from "#/db-schemas";
import { ViewFiltersSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { and, asc, eq, or, sql } from "drizzle-orm";
import { object, parse } from "valibot";

const ListInputSchema = object({ filters: ViewFiltersSchema });

export const listViews = Workflow.name("workspace.view.list")
  .input(ListInputSchema)
  .handler(async ({ filters }, ctx) => {
    if (!ctx.actorId) {
      throw new Error("Authentication required");
    }
    const validated = parse(ViewFiltersSchema, filters);

    const conditions = [
      or(eq(workspaceView.access, "global"), eq(workspaceView.ownerId, ctx.actorId)),
    ];
    if (validated.domain) {
      conditions.push(eq(workspaceView.domain, validated.domain));
    }
    if (validated.access) {
      conditions.push(eq(workspaceView.access, validated.access));
    }
    if (validated.isDefault !== undefined) {
      conditions.push(eq(workspaceView.isDefault, validated.isDefault));
    }
    if (validated.search) {
      conditions.push(sql`${workspaceView.name} ilike ${`%${validated.search}%`}`);
    }

    return ctx.db
      .select()
      .from(workspaceView)
      .where(and(...conditions))
      .orderBy(asc(workspaceView.name))
      .limit(validated.limit ?? 50)
      .offset(validated.offset ?? 0);
  });
