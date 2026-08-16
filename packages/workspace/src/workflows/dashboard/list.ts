import { workspaceDashboard } from "#/db-schemas";
import { DashboardFiltersSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { and, asc, eq, or, sql } from "drizzle-orm";
import { object, parse } from "valibot";

const ListInputSchema = object({ filters: DashboardFiltersSchema });

export const listDashboards = Workflow.name("workspace.dashboard.list")
  .input(ListInputSchema)
  .handler(async ({ filters }, ctx) => {
    if (!ctx.actorId) {
      throw new Error("Authentication required");
    }
    const validated = parse(DashboardFiltersSchema, filters);

    const conditions = [
      or(eq(workspaceDashboard.access, "global"), eq(workspaceDashboard.ownerId, ctx.actorId)),
    ];
    if (validated.access) {
      conditions.push(eq(workspaceDashboard.access, validated.access));
    }
    if (validated.search) {
      conditions.push(
        sql`(${workspaceDashboard.name} ilike ${`%${validated.search}%`} OR ${workspaceDashboard.description} ilike ${`%${validated.search}%`})`,
      );
    }

    return ctx.db
      .select()
      .from(workspaceDashboard)
      .where(and(...conditions))
      .orderBy(asc(workspaceDashboard.name))
      .limit(validated.limit ?? 50)
      .offset(validated.offset ?? 0);
  });
