import { healthcareDietPlan } from "#/db-schemas/ayush";
import { AYUSH_EVENTS } from "#/pubsub";
import { CreateDietPlanSchema } from "#/schemas/ayush";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const IssueDietInputSchema = object({ input: CreateDietPlanSchema });

export const issueDiet = Workflow.name("healthcare.ayush.issueDiet")
  .input(IssueDietInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateDietPlanSchema, input);
    const branchId = parsed.branchId ?? "main";
    const actorId = ctx.actorId ?? "system";

    const [row] = await ctx.step.run("insert-diet-plan", async () =>
      ctx.db
        .insert(healthcareDietPlan)
        .values({
          branch_id: branchId,
          case_id: parsed.caseId ?? null,
          chart: parsed.chart,
          created_by: actorId,
          patient_id: parsed.patientId,
          payload: {
            ...(parsed.pathyVariant ? { pathyVariant: parsed.pathyVariant } : {}),
            ...(parsed.language ? { language: parsed.language } : {}),
          },
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

    const dietSpec =
      row.payload && typeof row.payload === "object"
        ? (row.payload as Record<string, unknown>)
        : {};
    return {
      branchId: row.branch_id,
      caseId: row.case_id,
      chart: row.chart,
      createdAt: row.created_at.toISOString(),
      id: row.id,
      language: typeof dietSpec.language === "string" ? dietSpec.language : null,
      pathyVariant: typeof dietSpec.pathyVariant === "string" ? dietSpec.pathyVariant : null,
      patientId: row.patient_id,
      validFrom: row.valid_from,
      validTo: row.valid_to,
    };
  });
