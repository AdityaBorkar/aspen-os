import { hrPosition } from "#/db-schemas";
import { POSITION_EVENTS } from "#/pubsub";
import { UpdatePositionSchema } from "#/types";
import {
  ensurePositionNameUnique,
  fetchPositionById,
  validatePositionReportsTo,
} from "#/utils/position-utils";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, parse, pipe, string } from "valibot";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
  patch: UpdatePositionSchema,
});

export const updatePosition = Workflow.name("hr.position.update")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id, patch } = input;

    const parsed = parse(UpdatePositionSchema, patch);
    const existing = await fetchPositionById(ctx.db, id);

    if (parsed.name !== undefined || parsed.department !== undefined) {
      await ensurePositionNameUnique(ctx.db, {
        department: parsed.department ?? existing.department,
        excludeId: id,
        name: parsed.name ?? existing.name,
      });
    }

    if (parsed.reportsToPosition !== undefined && parsed.reportsToPosition !== null) {
      await fetchPositionById(ctx.db, parsed.reportsToPosition);
      await validatePositionReportsTo(ctx.db, parsed.reportsToPosition, id);
    }

    const [updated] = await ctx.db
      .update(hrPosition)
      .set({ ...parsed, updatedAt: new Date() })
      .where(eq(hrPosition.id, id))
      .returning();

    const changes = Object.fromEntries(
      Object.entries(parsed).filter(([, value]) => value !== undefined),
    );

    await ctx.pubsub.publish(POSITION_EVENTS.UPDATED, {
      changes,
      position: { id },
    });

    return updated;
  });
