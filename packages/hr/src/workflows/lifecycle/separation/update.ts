import { employeeSeparation } from "#/db-schemas";
import { LIFECYCLE_EVENTS } from "#/pubsub";
import { UpdateSeparationSchema } from "#/types";
import { fetchSeparationById } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, parse, pipe, string } from "valibot";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
  patch: UpdateSeparationSchema,
});

export const updateSeparation = Workflow.name("hr.lifecycle.update-separation")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id, patch } = input;

    const parsed = parse(UpdateSeparationSchema, patch);
    const existing = await fetchSeparationById(ctx.db, id);

    const [updated] = await ctx.db
      .update(employeeSeparation)
      .set({ ...parsed, updatedAt: new Date() })
      .where(eq(employeeSeparation.id, id))
      .returning();

    const transitionedToCompleted =
      parsed.status === "completed" && existing.status !== "completed";

    if (transitionedToCompleted) {
      await ctx.pubsub.publish(LIFECYCLE_EVENTS.SEPARATION_COMPLETED, {
        employeeId: existing.employeeId,
        separationId: id,
      });
    }

    return updated;
  });
