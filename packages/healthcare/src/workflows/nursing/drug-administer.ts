import { healthcareDrugAdministration, healthcareNursingEscalation } from "#/db-schemas/nursing";
import { NURSING_EVENTS } from "#/pubsub";
import { AdministerDrugSchema } from "#/schemas/nursing";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const DrugAdminInputSchema = object({ input: AdministerDrugSchema });

const INJECTABLE_HINT = /(inj\.?|injection|\biv\b|\bim\b|\bsc\b|vaccine|insulin|blood|infusion)/i;

export const drugAdminister = Workflow.name("healthcare.nursing.drug-administer")
  .input(DrugAdminInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(AdministerDrugSchema, input);
    const branchId = parsed.branchId ?? "main";
    // Batch/lot trace is mandatory for Given injectables, vaccines, and blood
    // products; Held/Refused/Missed outcomes never need a batch.
    const needsBatch =
      parsed.outcome === "Given" &&
      (INJECTABLE_HINT.test(parsed.drug) ||
        (parsed.route ? INJECTABLE_HINT.test(parsed.route) : true));
    if (needsBatch && !parsed.batchId) {
      throw new Error(
        "Batch is required for this injectable administration; scan the batch and retry",
      );
    }
    const hit = (parsed.allergies ?? []).find((allergen) =>
      parsed.drug.toLowerCase().includes(allergen.toLowerCase()),
    );
    if (hit && !parsed.doctorOverrideId) {
      throw new Error(`Allergy block: ${hit}; obtain a doctor override id and retry`);
    }
    if ((parsed.outcome === "Given" || parsed.outcome === "Missed") && !parsed.witness) {
      throw new Error("Given and missed doses need a witness; add a witness and retry");
    }
    const [row] = await ctx.step.run("insert-admin", async () =>
      ctx.db
        .insert(healthcareDrugAdministration)
        .values({
          batch_id: parsed.batchId ?? null,
          branch_id: branchId,
          doctor_override_id: parsed.doctorOverrideId ?? null,
          dose: parsed.dose,
          drug: parsed.drug,
          given_by: ctx.actorId ?? null,
          note: parsed.note ?? null,
          order_id: parsed.orderId ?? null,
          outcome: parsed.outcome.toLowerCase(),
          patient_id: parsed.patientId,
          payload: { allergies: parsed.allergies ?? [], route: parsed.route ?? null },
          witness: parsed.witness ?? null,
        })
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to record drug administration.");
    }
    if (parsed.outcome === "Missed") {
      await ctx.step.run("escalate-missed", async () =>
        ctx.db.insert(healthcareNursingEscalation).values({
          branch_id: branchId,
          drug_admin_id: row.id,
          patient_id: row.patient_id,
          reason: "Missed dose requires escalation",
          status: "open",
        }),
      );
    }
    const at = new Date().toISOString();
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: parsed.doctorOverrideId ? AUDIT_ACTION.OVERRIDE : AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.NURSING,
        newState: { drug: row.drug, outcome: row.outcome, patientId: row.patient_id },
      });
      await ctx.pubsub.publish(NURSING_EVENTS.CREATED, {
        actorId: ctx.actorId,
        at,
        branchId,
        id: row.id,
      });
    });
    return { id: row.id, outcome: row.outcome };
  });
