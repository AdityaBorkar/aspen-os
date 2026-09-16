import { healthcareDietPlan } from "#/db-schemas/ayush";
import { AYUSH_EVENTS } from "#/pubsub";
import { CreateDietPlanSchema } from "#/schemas/ayush";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";

import type { JsonValue } from "@aspen-os/platform/server";
import { Workflow } from "@aspen-os/platform/server";
import { is, object, parse, string } from "valibot";

const IssueDietInputSchema = object({ input: CreateDietPlanSchema });

export const issueDiet = Workflow.name("emr.ayush.issue-diet")
  .input(IssueDietInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateDietPlanSchema, input);
    const branchId = parsed.branchId ?? "main";
    const actorId = ctx.actorId ?? "system";

    const dietPayload: Record<string, JsonValue> = {};
    if (parsed.pathyVariant) {
      dietPayload.pathyVariant = parsed.pathyVariant;
    }
    if (parsed.language) {
      dietPayload.language = parsed.language;
    }
    const [row] = await ctx.step.run("insert-diet-plan", async () =>
      ctx.db
        .insert(healthcareDietPlan)
        .values({
          branch_id: branchId,
          case_id: parsed.caseId ?? null,
          chart: parsed.chart,
          created_by: actorId,
          patient_id: parsed.patientId,
          payload: dietPayload,
          valid_from: parsed.validFrom,
          valid_to: parsed.validTo,
        })
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to issue the diet plan.");
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.AYUSH,
        newState: {
          id: row.id,
          patientId: row.patient_id,
          validFrom: row.valid_from,
          validTo: row.valid_to,
        },
      });
      await ctx.pubsub.publish(AYUSH_EVENTS.CREATED, {
        actorId,
        at: new Date().toISOString(),
        branchId,
        id: row.id,
      });
    });

    const dietSpec: Record<string, JsonValue> = row.payload;
    return {
      branchId: row.branch_id,
      caseId: row.case_id,
      chart: row.chart,
      createdAt: row.created_at.toISOString(),
      id: row.id,
      language: is(string(), dietSpec.language) ? dietSpec.language : null,
      pathyVariant: is(string(), dietSpec.pathyVariant) ? dietSpec.pathyVariant : null,
      patientId: row.patient_id,
      validFrom: row.valid_from,
      validTo: row.valid_to,
    };
  });
