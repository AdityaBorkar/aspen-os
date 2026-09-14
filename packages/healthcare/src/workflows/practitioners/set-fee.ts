import { healthcarePractitionerFee } from "#/db-schemas/practitioners";
import { PRACTITIONER_EVENTS } from "#/pubsub";
import { SetPractitionerFeeSchema } from "#/schemas/practitioners";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchPractitionerStep, toFeeDto } from "#/workflow-steps/fetch-practitioner";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const SetFeeInputSchema = object({ input: SetPractitionerFeeSchema });

export const setPractitionerFee = Workflow.name("healthcare.practitioners.set-fee")
  .input(SetFeeInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(SetPractitionerFeeSchema, input);
    if (parsed.amount < 0) {
      throw new Error(`Fee amount (${parsed.amount}) cannot be negative.`);
    }
    const today = new Date().toISOString().slice(0, 10);
    const effectiveFrom = parsed.effectiveFrom ?? today;
    if (effectiveFrom < today) {
      throw new Error(
        `Fee effective date (${effectiveFrom}) must be today or later; fees are prospective only.`,
      );
    }
    const practitioner = await ctx.step.run(fetchPractitionerStep, {
      id: parsed.practitionerId,
    });
    const [row] = await ctx.step.run("insert-fee", async () =>
      ctx.db
        .insert(healthcarePractitionerFee)
        .values({
          amount: String(parsed.amount),
          branch_id: parsed.branchId,
          effective_from: effectiveFrom,
          id: crypto.randomUUID(),
          practitioner_id: parsed.practitionerId,
          service_id: parsed.serviceId ?? null,
        })
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to save fee.");
    }
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.PRACTITIONER,
        newState: {
          amount: row.amount,
          effectiveFrom: row.effective_from,
          id: row.id,
          practitionerId: row.practitioner_id,
        },
      });
      await ctx.pubsub.publish(PRACTITIONER_EVENTS.UPDATED, {
        actorId: ctx.actorId,
        at: new Date().toISOString(),
        branchId: practitioner.branch_id,
        id: parsed.practitionerId,
      });
    });
    return toFeeDto(row);
  });
