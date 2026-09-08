import { masterFilterView } from "#/db-schemas";
import { FilterViewFiltersSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { and, asc, eq, isNull, or, sql } from "drizzle-orm";
import { object, parse } from "valibot";

const ListInputSchema = object({ filters: FilterViewFiltersSchema });

export const listFilterViews = Workflow.name("masters.filter-view.list")
  .input(ListInputSchema)
  .handler(async ({ filters }, ctx) => {
    if (!ctx.actorId) {
      throw new Error("Authentication required");
    }
    const validated = parse(FilterViewFiltersSchema, filters);

    const conditions = [
      or(eq(masterFilterView.access, "global"), eq(masterFilterView.owner_id, ctx.actorId)),
    ];
    if (validated.domain) {
      conditions.push(eq(masterFilterView.domain, validated.domain));
    }
    if (validated.access) {
      conditions.push(eq(masterFilterView.access, validated.access));
    }
    if (validated.isDefault !== undefined) {
      conditions.push(eq(masterFilterView.is_default, validated.isDefault));
    }
    if (validated.projectId !== undefined) {
      conditions.push(
        validated.projectId === null
          ? isNull(masterFilterView.project_id)
          : eq(masterFilterView.project_id, validated.projectId),
      );
    }
    if (validated.viewType) {
      conditions.push(eq(masterFilterView.view_type, validated.viewType));
    }
    if (validated.search) {
      conditions.push(sql`${masterFilterView.name} ilike ${`%${validated.search}%`}`);
    }

    return ctx.db
      .select()
      .from(masterFilterView)
      .where(and(...conditions))
      .orderBy(asc(masterFilterView.name))
      .limit(validated.limit ?? 50)
      .offset(validated.offset ?? 0);
  });
