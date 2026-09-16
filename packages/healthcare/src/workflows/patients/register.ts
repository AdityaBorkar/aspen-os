import { healthcarePatient } from "#/db-schemas/patient";
import { toFhirHint } from "#/fhir/event-hint";
import { PATIENT_EVENTS } from "#/pubsub";
import { CreatePatientSchema } from "#/schemas/patients";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { toPatientDto } from "#/workflow-steps/fetch-patient";
import { nextHealthcareSeries } from "#/workflow-steps/series";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq, isNull, or } from "drizzle-orm";
import { object, parse } from "valibot";

const RegisterInputSchema = object({ input: CreatePatientSchema });

export const registerPatient = Workflow.name("healthcare.patients.register")
  .input(RegisterInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreatePatientSchema, input);
    const branchId = parsed.branchId ?? "main";

    const dupes = await ctx.step.run("dedupe-check", async () => {
      const conditions = [];
      if (parsed.phone) {
        conditions.push(eq(healthcarePatient.phone, parsed.phone));
      }
      if (parsed.abha) {
        conditions.push(eq(healthcarePatient.abha, parsed.abha));
      }
      if (conditions.length === 0) {
        return [];
      }
      return ctx.db
        .select({
          full_name: healthcarePatient.full_name,
          id: healthcarePatient.id,
          uhid: healthcarePatient.uhid,
        })
        .from(healthcarePatient)
        .where(
          and(
            eq(healthcarePatient.branch_id, branchId),
            isNull(healthcarePatient.merged_into),
            or(...conditions),
          ),
        )
        .limit(1);
    });
    const [first] = dupes;
    if (first) {
      throw new Error(
        `Possible duplicate of ${first.uhid} (${first.full_name}); open that record or file a merge request instead of registering again.`,
      );
    }

    const no = await ctx.step.run(nextHealthcareSeries, { input: { series: "uhid" } });
    const uhid = `UHID-${String(no).padStart(6, "0")}`;

    const [row] = await ctx.step.run("insert-patient", async () =>
      ctx.db
        .insert(healthcarePatient)
        .values({
          abha: parsed.abha ?? null,
          branch_id: branchId,
          dob: parsed.dob ?? null,
          full_name: parsed.fullName,
          gender: parsed.gender ?? null,
          guardian: parsed.guardian ?? null,
          language: parsed.language ?? "en",
          payload: { allergies: parsed.allergies ?? [] },
          phone: parsed.phone,
          status: "active",
          uhid,
        })
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to register patient.");
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.PATIENT,
        newState: { fullName: parsed.fullName, id: row.id, phone: parsed.phone, uhid },
      });
      await ctx.pubsub.publish(PATIENT_EVENTS.CREATED, {
        actorId: ctx.actorId,
        at: new Date().toISOString(),
        branchId,
        data: { fhir: toFhirHint("Patient", row.id) },
        id: row.id,
      });
    });

    return toPatientDto(row);
  });
