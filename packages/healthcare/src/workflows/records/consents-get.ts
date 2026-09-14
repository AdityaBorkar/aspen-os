import { healthcareConsentGrant } from "#/db-schemas/records";
import { ConsentsGetSchema } from "#/schemas/records";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object, parse } from "valibot";

const ConsentsGetInputSchema = object({ input: ConsentsGetSchema });

export const consentsGet = Workflow.name("healthcare.records.consents-get")
  .input(ConsentsGetInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(ConsentsGetSchema, input);
    const rows = await ctx.step.run("load-consents", async () =>
      ctx.db
        .select()
        .from(healthcareConsentGrant)
        .where(
          and(
            eq(healthcareConsentGrant.branch_id, parsed.branchId ?? "main"),
            eq(healthcareConsentGrant.patient_id, parsed.patientId),
          ),
        )
        .limit(200),
    );
    return rows.map((row) => ({
      encounterId: row.encounter_id,
      grantedBy: row.granted_by,
      id: row.id,
      kind: row.kind,
      status: row.status,
    }));
  });
