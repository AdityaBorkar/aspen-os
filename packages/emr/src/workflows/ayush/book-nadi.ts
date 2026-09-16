import { healthcareAyushCaseSheet } from "#/db-schemas/ayush";
import { AYUSH_EVENTS } from "#/pubsub";
import { BookNadiSchema } from "#/schemas/ayush";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";

import type { JsonValue } from "@aspen-os/platform/server";
import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse } from "valibot";

const BookNadiInputSchema = object({ input: BookNadiSchema });

export const bookNadi = Workflow.name("emr.ayush.bookNadi")
  .input(BookNadiInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(BookNadiSchema, input);
    const branchId = parsed.branchId ?? "main";
    const actorId = ctx.actorId ?? "system";

    // Nadi examination is booked as a Service -> Facility (Nadi room) slot.
    // Findings land on the AyushCaseSheet payload once recorded.
    if (parsed.caseId) {
      const kase = await ctx.step.run("fetch-case-sheet", async () => {
        const [row] = await ctx.db
          .select()
          .from(healthcareAyushCaseSheet)
          .where(eq(healthcareAyushCaseSheet.id, parsed.caseId ?? ""))
          .limit(1);
        if (!row) {
          throw new Error("Case sheet not found; save the case sheet first");
        }
        return row;
      });
      if (kase.patient_id !== parsed.patientId) {
        throw new Error("Patient does not match the case sheet; check the selected patient");
      }
      if (parsed.findings) {
        const entry = {
          at: new Date().toISOString(),
          facilityId: parsed.facilityId,
          findings: parsed.findings,
          serviceId: parsed.serviceId,
        } satisfies Record<string, JsonValue>;
        const prior = kase.payload.nadiExams;
        const nadiExams = [...(Array.isArray(prior) ? prior : []), entry];
        await ctx.step.run("record-nadi-findings", async () =>
          ctx.db
            .update(healthcareAyushCaseSheet)
            .set({ payload: { ...kase.payload, nadiExams } })
            .where(eq(healthcareAyushCaseSheet.id, parsed.caseId ?? "")),
        );
      }
    }

    const booking = {
      at: new Date().toISOString(),
      bookedBy: actorId,
      caseId: parsed.caseId ?? null,
      date: parsed.date,
      encounterId: parsed.encounterId ?? null,
      facilityId: parsed.facilityId,
      patientId: parsed.patientId,
      serviceId: parsed.serviceId,
      slot: parsed.slot,
    } satisfies Record<string, JsonValue>;

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: parsed.caseId ?? parsed.patientId,
        entityType: AUDIT_ENTITY_TYPE.AYUSH,
        newState: booking,
      });
      await ctx.pubsub.publish(AYUSH_EVENTS.CREATED, {
        actorId,
        at: new Date().toISOString(),
        branchId,
        id: parsed.caseId ?? parsed.patientId,
      });
    });

    return {
      branchId,
      caseId: parsed.caseId ?? null,
      date: parsed.date,
      facilityId: parsed.facilityId,
      findings: parsed.findings ?? null,
      patientId: parsed.patientId,
      serviceId: parsed.serviceId,
      slot: parsed.slot,
    };
  });
