import { complianceObligation } from "#/db-schemas";
import type { NewComplianceObligation } from "#/db-schemas";
import { COMPLIANCE_EVENTS } from "#/pubsub";
import { UpdateObligationSchema } from "#/schemas";
import type { UpdateObligationInput } from "#/schemas";
import { toDateOnly } from "#/utils/dates";
import { fetchObligationStep } from "#/workflow-steps/fetch-obligation";
import { diffRecords } from "#/workflows/document/shared";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { parse } from "valibot";

const DATE_KEYS = new Set(["endDate", "startDate"]);

const updateObligation = Workflow.name("obligation.update").handler(
  async (input: { id: string; patch: UpdateObligationInput }, ctx) => {
    const { id, patch } = input;
    const current = await ctx.step.run(fetchObligationStep, { id });
    const parsed = parse(UpdateObligationSchema, patch);

    const updateData: Partial<NewComplianceObligation> = { updatedAt: new Date() };

    for (const [key, value] of Object.entries(parsed)) {
      if (value === undefined) {
        continue;
      }
      if (DATE_KEYS.has(key)) {
        // SAFETY: DATE_KEYS only contains date columns, so narrowed values are Date instances.
        Object.assign(updateData, {
          [key]: value ? toDateOnly(value as Date) : null,
        });
      } else {
        Object.assign(updateData, { [key]: value });
      }
    }

    if (Object.keys(updateData).length <= 1) {
      return current;
    }

    const [updated] = await ctx.db
      .update(complianceObligation)
      .set(updateData)
      .where(eq(complianceObligation.id, id))
      .returning();

    if (!updated) {
      throw new Error("Database operation returned no result");
    }

    const changes = diffRecords(current, updated, Object.keys(updateData));

    await ctx.audit.write({
      action: "updated",
      actorId: current.createdBy,
      changes,
      crudAction: "update",
      entityId: id,
      entityType: "compliance_obligation",
      newState: updated,
      previousState: current,
    });

    await ctx.pubsub.publish(COMPLIANCE_EVENTS.OBLIGATION_UPDATED, {
      changes,
      obligation: { id: updated.id, name: updated.name },
    });

    return updated;
  },
);

export { updateObligation };
