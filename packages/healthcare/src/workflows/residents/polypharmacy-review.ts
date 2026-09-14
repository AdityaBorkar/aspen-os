import { healthcarePolypharmacyReview } from "#/db-schemas/residents";
import { RESIDENT_EVENTS } from "#/pubsub";
import { CreatePolypharmacyReviewSchema } from "#/schemas/residents";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchResidentStep } from "#/workflow-steps/fetch-resident";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const PolypharmacyReviewInputSchema = object({ input: CreatePolypharmacyReviewSchema });

export const polypharmacyReview = Workflow.name("healthcare.residents.polypharmacy-review")
  .input(PolypharmacyReviewInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreatePolypharmacyReviewSchema, input);
    const branchId = parsed.branchId ?? "main";
    const resident = await ctx.step.run(fetchResidentStep, { id: parsed.residentId });
    if (parsed.meds.length === 0) {
      throw new Error("Review needs at least one medication; add meds and retry");
    }
    const [row] = await ctx.step.run("insert-review", async () =>
      ctx.db
        .insert(healthcarePolypharmacyReview)
        .values({
          action: parsed.action,
          branch_id: branchId,
          meds: parsed.meds,
          note: parsed.note ?? null,
          resident_id: resident.id,
          reviewed_by: parsed.reviewedBy,
        })
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to record polypharmacy review.");
    }
    const at = new Date().toISOString();
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.RESIDENT,
        newState: { action: row.action, medCount: row.meds.length },
      });
      await ctx.pubsub.publish(RESIDENT_EVENTS.CREATED, {
        actorId: ctx.actorId,
        at,
        branchId,
        id: row.id,
      });
    });
    return { action: row.action, id: row.id, residentId: row.resident_id };
  });
