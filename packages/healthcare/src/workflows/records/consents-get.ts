import { ConsentsGetSchema } from "#/schemas/records";
import { listPatientConsents } from "#/workflows/shared/consent-lifecycle";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const ConsentsGetInputSchema = object({ input: ConsentsGetSchema });

export const consentsGet = Workflow.name("healthcare.records.consents-get")
  .input(ConsentsGetInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(ConsentsGetSchema, input);
    return ctx.step.run("load-consents", async () =>
      listPatientConsents(ctx.db, parsed.branchId ?? "main", parsed.patientId),
    );
  });
