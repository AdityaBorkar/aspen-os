import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

import { getActiveFields, validateFieldValues } from "../../../services/classify-service";
import { IdSchema } from "../../../types";
import { fetchFileStep } from "../../../workflow-steps/fetch-file";
import { listClasses } from "../../class/list";

const DetailInputSchema = object({ id: IdSchema });

export const getTriageDetail = Workflow.name("dms.triage.detail")
  .input(DetailInputSchema)
  .handler(async ({ id }, ctx) => {
    const file = await ctx.step.run(fetchFileStep, { id });

    const classes = await listClasses.run(
      { filters: { activeOnly: true } },
      { db: ctx.db, pubsub: ctx.pubsub },
    );

    const candidateReport = await ctx.step.run("missing-required-fields", async () =>
      Promise.all(
        classes.map(async (cls) => {
          const fields = await getActiveFields(ctx.db, cls.id);
          const { missing } = validateFieldValues(
            fields,
            (file.fieldValues as Record<string, unknown> | undefined) ?? {},
          );
          return { classId: cls.id, className: cls.name, missing };
        }),
      ),
    );

    return { file, missingRequiredFields: candidateReport };
  });
