import { healthcarePractitioner } from "#/db-schemas/practitioners";
import { PRACTITIONER_EVENTS } from "#/pubsub";
import { PractitionerIdSchema } from "#/schemas/practitioners";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchPractitionerStep, toPractitionerDto } from "#/workflow-steps/fetch-practitioner";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse } from "valibot";

const DeactivatePractitionerInputSchema = object({ input: PractitionerIdSchema });

export const deactivatePractitioner = Workflow.name("healthcare.practitioners.deactivate")
  .input(DeactivatePractitionerInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(PractitionerIdSchema, input);
    const existing = await ctx.step.run(fetchPractitionerStep, { id: parsed.id });
    if (existing.status === "inactive") {
      throw new Error(`Practitioner "${parsed.id}" is already inactive.`);
    }
    const [row] = await ctx.step.run("deactivate-practitioner", async () =>
      ctx.db
        .update(healthcarePractitioner)
        .set({ status: "inactive", updated_at: new Date() })
        .where(eq(healthcarePractitioner.id, parsed.id))
        .returning(),
    );
    if (!row) {
      throw new Error(`Failed to deactivate practitioner "${parsed.id}".`);
    }
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.UPDATED,
        changes: { status: "inactive" },
        crudAction: "update",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.PRACTITIONER,
      });
      await ctx.pubsub.publish(PRACTITIONER_EVENTS.UPDATED, {
        actorId: ctx.actorId,
        at: new Date().toISOString(),
        branchId: row.branch_id,
        id: row.id,
      });
    });
    return toPractitionerDto(row);
  });
