import { workspaceFilterView } from "#/db-schemas";
import { FilterViewFiltersSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { and, asc, eq, isNull, or, sql } from "drizzle-orm";
import { object, parse } from "valibot";

const ListInputSchema = object({ filters: FilterViewFiltersSchema });

export const listFilterViews = Workflow.name("workspace.filter-view.list")
  .input(ListInputSchema)
  .handler(async ({ filters }, ctx) => {
    if (!ctx.actorId) {
      throw new Error("Authentication required");
    }
    const validated = parse(FilterViewFiltersSchema, filters);

    const conditions = [
      or(eq(workspaceFilterView.access, "global"), eq(workspaceFilterView.owner_id, ctx.actorId)),
    ];
    if (validated.domain) {
      conditions.push(eq(workspaceFilterView.domain, validated.domain));
    }
    if (validated.access) {
      conditions.push(eq(workspaceFilterView.access, validated.access));
    }
    if (validated.isDefault !== undefined) {
      conditions.push(eq(workspaceFilterView.is_default, validated.isDefault));
    }
    if (validated.projectId !== undefined) {
      conditions.push(
        validated.projectId === null
          ? isNull(workspaceFilterView.project_id)
          : eq(workspaceFilterView.project_id, validated.projectId),
      );
    }
    if (validated.viewType) {
      conditions.push(eq(workspaceFilterView.view_type, validated.viewType));
    }
    if (validated.search) {
      conditions.push(sql`${workspaceFilterView.name} ilike ${`%${validated.search}%`}`);
    }

    return ctx.db
      .select()
      .from(workspaceFilterView)
      .where(and(...conditions))
      .orderBy(asc(workspaceFilterView.name))
      .limit(validated.limit ?? 50)
      .offset(validated.offset ?? 0);
  });
