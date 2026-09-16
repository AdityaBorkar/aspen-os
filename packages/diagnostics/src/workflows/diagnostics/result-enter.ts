import {
  healthcareLabOrder,
  healthcareLabResult,
  healthcareLabTest,
} from "#/db-schemas/diagnostics";
import { healthcareObservation } from "#/db-schemas/observation";
import { toFhirHint } from "#/fhir/event-hint";
import { DIAGNOSTICS_EVENTS } from "#/pubsub";
import { ResultEntrySchema } from "#/schemas/diagnostics";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import {
  buildLabObservationRow,
  labInterpretationFromFlag,
  labStatusForVersion,
} from "#/workflow-steps/canonical-dual-write";
import { fetchLabOrderStep } from "#/workflow-steps/fetch-diagnostics";
import { fetchOpenEncounterStep } from "#/workflow-steps/fetch-encounter";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { is, object, parse, string } from "valibot";

const ResultEntryInputSchema = object({ input: ResultEntrySchema });

export const resultEnter = Workflow.name("diagnostics.result-enter")
  .input(ResultEntryInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(ResultEntrySchema, input);
    const branchId = parsed.branchId ?? "main";

    const order = await ctx.step.run(fetchLabOrderStep, { id: parsed.orderId });
    if (order.branch_id !== branchId) {
      throw new Error("Lab order belongs to a different branch; verify the order and retry.");
    }
    if (order.encounter_id) {
      // Sign-freeze: laboratory observations inherit the parent encounter
      // freeze; signed (finished) encounters only accept
      // encounter_addendum writes.
      await ctx.step.run(fetchOpenEncounterStep, {
        id: order.encounter_id,
        patientId: order.patient_id,
      });
    }
    const rawDetail = order.payload.statusDetail;
    const detail = is(string(), rawDetail) ? rawDetail : "ordered";
    if (detail === "cancelled") {
      throw new Error("Lab order is cancelled; results cannot be entered against it.");
    }
    if (detail === "authorized" || detail === "delivered" || detail === "billed") {
      throw new Error("Report is already authorized or beyond; amend via a fresh order.");
    }

    const prior = await ctx.step.run("fetch-prior-results", async () =>
      ctx.db
        .select()
        .from(healthcareLabResult)
        .where(
          and(
            eq(healthcareLabResult.branch_id, branchId),
            eq(healthcareLabResult.order_id, parsed.orderId),
            eq(healthcareLabResult.test_code, parsed.testCode),
          ),
        ),
    );
    const version = prior.length + 1;

    const ref = await ctx.step.run("fetch-test-ref", async () => {
      const [row] = await ctx.db
        .select({
          ref_high: healthcareLabTest.ref_high,
          ref_low: healthcareLabTest.ref_low,
        })
        .from(healthcareLabTest)
        .where(
          and(
            eq(healthcareLabTest.branch_id, branchId),
            eq(healthcareLabTest.code, parsed.testCode),
          ),
        )
        .limit(1);
      return row ?? null;
    });

    let flag = parsed.flag ?? "normal";
    const numericValue = Number(parsed.value);
    const valueIsNumeric = parsed.value.trim() !== "" && Number.isFinite(numericValue);
    if (!parsed.flag && valueIsNumeric && ref) {
      const low = ref.ref_low === null ? null : Number(ref.ref_low);
      const high = ref.ref_high === null ? null : Number(ref.ref_high);
      if (low !== null && numericValue < low) {
        flag = "L";
      } else if (high !== null && numericValue > high) {
        flag = "H";
      }
    }

    let delta: number | null = null;
    const lastPrior = prior[prior.length - 1];
    if (valueIsNumeric && lastPrior) {
      const priorNumeric = Number(lastPrior.value);
      if (lastPrior.value.trim() !== "" && Number.isFinite(priorNumeric)) {
        delta = numericValue - priorNumeric;
      }
    }

    // The observation id is pinned up front so the event hint can
    // reference the canonical row without changing the DTO.
    const observationId = crypto.randomUUID();
    const entered = await ctx.step.run("enter-result", async () => {
      // Dual-write (HEALTHCARE-SPEC §§6, 13): legacy lab result + order
      // promotion first, canonical laboratory observation second, inside
      // one transaction. value text becomes value_number when numeric else
      // value_text; flag becomes interpretation; master refs snapshot.
      const [row] = await ctx.db.transaction(async (tx) => {
        const [result] = await tx
          .insert(healthcareLabResult)
          .values({
            branch_id: branchId,
            entered_by: parsed.enteredBy,
            flag,
            order_id: parsed.orderId,
            payload: { delta },
            test_code: parsed.testCode,
            value: parsed.value,
            version,
          })
          .returning();
        if (!result) {
          throw new Error("Failed to enter result.");
        }
        await tx
          .update(healthcareLabOrder)
          .set({
            payload: {
              ...order.payload,
              draft: true,
              enteredBy: parsed.enteredBy,
              statusDetail: "resulted",
            },
            status: "processing",
          })
          .where(eq(healthcareLabOrder.id, order.id));
        await tx.insert(healthcareObservation).values(
          buildLabObservationRow({
            absorbedId: result.id,
            branchId,
            encounterId: order.encounter_id,
            id: observationId,
            interpretation: labInterpretationFromFlag(flag),
            numericValue: valueIsNumeric ? numericValue : null,
            patientId: order.patient_id,
            performerId: parsed.enteredBy,
            refHigh: ref?.ref_high ?? null,
            refLow: ref?.ref_low ?? null,
            status: labStatusForVersion(version),
            testCode: parsed.testCode,
            valueText: parsed.value,
          }),
        );
        return [result];
      });
      if (!row) {
        throw new Error("Failed to enter result.");
      }
      return row;
    });

    const dto = {
      delta,
      draftWatermark: true as const,
      enteredAt: entered.entered_at.toISOString(),
      enteredBy: entered.entered_by,
      flag: entered.flag,
      orderId: entered.order_id,
      testCode: entered.test_code,
      value: entered.value,
      version: entered.version,
    };
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: entered.id,
        entityType: AUDIT_ENTITY_TYPE.DIAGNOSTICS,
        newState: { flag, orderId: parsed.orderId, testCode: parsed.testCode, version },
      });
      await ctx.pubsub.publish(DIAGNOSTICS_EVENTS.UPDATED, {
        actorId: ctx.actorId,
        at: new Date().toISOString(),
        branchId,
        // Hint points at the canonical Observation row written above; the
        // event id stays the lab order so old consumers are unaffected.
        data: { fhir: toFhirHint("Observation", observationId) },
        id: order.id,
      });
    });
    return dto;
  });
