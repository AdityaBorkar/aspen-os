import { healthcareResident } from "#/db-schemas/residents";
import { RESIDENT_EVENTS } from "#/pubsub";
import { CreateFeedbackSchema } from "#/schemas/residents";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchResidentStep } from "#/workflow-steps/fetch-resident";

import type { JsonValue } from "@aspen-os/platform/server";
import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse } from "valibot";

const FeedbackInputSchema = object({ input: CreateFeedbackSchema });

export const feedback = Workflow.name("inpatient.residents.feedback")
  .input(FeedbackInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateFeedbackSchema, input);
    const branchId = parsed.branchId ?? "main";
    const actorId = ctx.actorId ?? "system";

    const entry = {
      actionTaken: parsed.actionTaken ?? null,
      actorId,
      at: new Date().toISOString(),
      category: parsed.category,
      message: parsed.message,
      residentId: parsed.residentId ?? null,
      submittedBy: parsed.submittedBy,
    } satisfies Record<string, JsonValue>;

    if (parsed.residentId) {
      const resident = await ctx.step.run(fetchResidentStep, { id: parsed.residentId });
      const prior = resident.payload.feedback;
      const items = [...(Array.isArray(prior) ? prior : []), entry];
      await ctx.step.run("append-feedback", async () => {
        await ctx.db
          .update(healthcareResident)
          .set({ payload: { ...resident.payload, feedback: items } })
          .where(eq(healthcareResident.id, resident.id));
      });
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: parsed.residentId ?? parsed.submittedBy,
        entityType: AUDIT_ENTITY_TYPE.RESIDENT,
        newState: { category: parsed.category, residentId: parsed.residentId ?? null },
      });
      await ctx.pubsub.publish(RESIDENT_EVENTS.CREATED, {
        actorId,
        at: new Date().toISOString(),
        branchId,
        id: parsed.residentId ?? parsed.submittedBy,
      });
    });

    return { category: parsed.category, residentId: parsed.residentId ?? null };
  });
