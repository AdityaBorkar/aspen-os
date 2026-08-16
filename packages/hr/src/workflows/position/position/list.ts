import { hrPosition, hrPositionAssignment } from "#/db-schemas";
import { PositionFiltersSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { object, optional, parse } from "valibot";

const InputSchema = object({
  filters: optional(PositionFiltersSchema),
});

export const listPositions = Workflow.name("hr.position.list")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { filters } = input;

    const parsed = filters ? parse(PositionFiltersSchema, filters) : {};
    const conditions = [];

    if (parsed.department) {
      conditions.push(eq(hrPosition.department, parsed.department));
    }
    if (parsed.branch) {
      conditions.push(eq(hrPosition.branch, parsed.branch));
    }
    if (parsed.designation) {
      conditions.push(eq(hrPosition.designation, parsed.designation));
    }
    if (parsed.isActive !== undefined) {
      conditions.push(eq(hrPosition.isActive, parsed.isActive));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const positions = await ctx.db.select().from(hrPosition).where(whereClause);
    if (positions.length === 0) {
      return [];
    }

    const assignmentRows = await ctx.db
      .select({ positionId: hrPositionAssignment.positionId })
      .from(hrPositionAssignment)
      .where(
        and(
          isNull(hrPositionAssignment.toDate),
          inArray(
            hrPositionAssignment.positionId,
            positions.map((position) => position.id),
          ),
        ),
      );

    const filledCounts = new Map<string, number>();
    for (const row of assignmentRows) {
      filledCounts.set(row.positionId, (filledCounts.get(row.positionId) ?? 0) + 1);
    }

    const result: ((typeof positions)[number] & { filledCount: number })[] = [];
    for (const position of positions) {
      result.push({
        ...position,
        filledCount: filledCounts.get(position.id) ?? 0,
      });
    }

    return result;
  });
