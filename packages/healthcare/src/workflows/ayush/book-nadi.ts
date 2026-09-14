import { healthcareAyushCaseSheet } from "#/db-schemas/ayush";
import { AYUSH_EVENTS } from "#/pubsub";
import { CreateFollowUpSchema } from "#/schemas/ayush";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";

import type { JsonValue } from "@aspen-os/platform/server";
import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse } from "valibot";

const BookNadiInputSchema = object({ input: CreateFollowUpSchema });

export const bookNadi = Workflow.name("healthcare.ayush.bookNadi")
  .input(BookNadiInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateFollowUpSchema, input);
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

    const nowIso = new Date().toISOString();
    const entry = {
      at: nowIso,
      improvement: parsed.improvement,
      notes: parsed.notes,
      visitNo: parsed.visitNo,
    } satisfies Record<string, JsonValue>;
    const prior = kase.payload.followups;
    const followups = [...(Array.isArray(prior) ? prior : []), entry];

    const [row] = await ctx.step.run("append-followup", async () =>
      ctx.db
        .update(healthcareAyushCaseSheet)
        .set({ payload: { ...kase.payload, followups } })
        .where(eq(healthcareAyushCaseSheet.id, parsed.caseId))
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to record the nadi follow-up.");
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.AYUSH,
        newState: {
          caseId: row.id,
          id: row.id,
          improvement: parsed.improvement,
          patientId: row.patient_id,
          visitNo: parsed.visitNo,
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
      caseId: row.id,
      id: row.id,
      improvement: parsed.improvement,
      notes: parsed.notes,
      patientId: row.patient_id,
      visitNo: parsed.visitNo,
    };
  });
