import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

import { getActiveFields, validateFieldValues } from "../services/classify-service";
import { IdSchema } from "../types";
import { listClasses } from "./class.list";
import { fetchDocumentStep } from "./steps/fetch-document";

const DetailInputSchema = object({ id: IdSchema });

export const getTriageDetail = Workflow.name("dms.triage.detail")
  .input(DetailInputSchema)
  .handler(async ({ id }, ctx) => {
    const doc = await ctx.step.run(fetchDocumentStep, { documentId: id });

    const classes = await listClasses.run(
      { filters: { activeOnly: true } },
      { db: ctx.db, pubsub: ctx.pubsub },
    );

    const candidateReport = await ctx.step.run("missing-required-fields", async () => {
      const report: {
        classId: string;
        className: string;
        missing: string[];
      }[] = [];

      for (const cls of classes) {
        const fields = await getActiveFields(ctx.db, cls.id);
        const { missing } = validateFieldValues(
          fields,
          (doc.fieldValues as Record<string, unknown> | undefined) ?? {},
        );
        report.push({ classId: cls.id, className: cls.name, missing });
      }

      return report;
    });

    return { document: doc, missingRequiredFields: candidateReport };
  });
