import { healthcareAyushCaseSheet, healthcareRepertorization } from "#/db-schemas/ayush";
import { AYUSH_EVENTS } from "#/pubsub";
import { CreateRepertorizationSchema } from "#/schemas/ayush";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";

import type { JsonValue } from "@aspen-os/platform/server";
import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse } from "valibot";

const RepertorizeInputSchema = object({ input: CreateRepertorizationSchema });

export const repertorize = Workflow.name("healthcare.ayush.repertorize")
  .input(RepertorizeInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateRepertorizationSchema, input);
    const branchId = parsed.branchId ?? "main";
    const actorId = ctx.actorId ?? "system";

    const kase = await ctx.step.run("fetch-case-sheet", async () => {
      const [row] = await ctx.db
        .select()
        .from(healthcareAyushCaseSheet)
        .where(eq(healthcareAyushCaseSheet.id, parsed.caseId))
        .limit(1);
      if (!row) {
        throw new Error("Case sheet not found; save the case sheet first");
      }
      return row;
    });
    if (kase.patient_id !== parsed.patientId) {
      throw new Error("Patient does not match the case sheet; check the selected patient");
    }

    const repertorizePayload: Record<string, JsonValue> = {};
    if (parsed.miasm) {
      repertorizePayload.miasm = parsed.miasm;
    }
    if (parsed.dose) {
      repertorizePayload.dose = parsed.dose;
    }
    const [row] = await ctx.step.run("insert-repertorization", async () =>
      ctx.db
        .insert(healthcareRepertorization)
        .values({
          branch_id: branchId,
          case_id: parsed.caseId,
          created_by: actorId,
          patient_id: parsed.patientId,
          payload: repertorizePayload,
          potency: parsed.potency,
          remedy: parsed.remedy,
          rubrics: parsed.rubrics,
        })
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to save the repertorization.");
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.AYUSH,
        newState: {
          caseId: row.case_id,
          id: row.id,
          patientId: row.patient_id,
          remedy: row.remedy,
        },
      });
      await ctx.pubsub.publish(AYUSH_EVENTS.CREATED, {
        actorId,
        at: new Date().toISOString(),
        branchId,
        id: row.id,
      });
    });

    return {
      branchId: row.branch_id,
      caseId: row.case_id,
      createdAt: row.created_at.toISOString(),
      id: row.id,
      patientId: row.patient_id,
      potency: row.potency,
      remedy: row.remedy,
      rubrics: row.rubrics,
    };
  });
