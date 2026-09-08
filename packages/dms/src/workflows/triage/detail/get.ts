import { dmsClassField } from "#/db-schemas";
import { IdSchema } from "#/types";
import type { ClassFieldRow } from "#/workflow-steps/classify-service";
import { validateFieldValues } from "#/workflow-steps/classify-service";
import { fetchFileStep } from "#/workflow-steps/fetch-file";
import { listClasses } from "#/workflows/class/list";

import { Workflow } from "@aspen-os/platform/server";
import { inArray } from "drizzle-orm";
import { object } from "valibot";

const DetailInputSchema = object({ id: IdSchema });

export const getTriageDetail = Workflow.name("dms.triage.detail")
  .input(DetailInputSchema)
  .handler(async ({ id }, ctx) => {
    const file = await ctx.step.run(fetchFileStep, { id });

    const classes = await listClasses.run(
      { filters: { activeOnly: true } },
      { db: ctx.db, pubsub: ctx.pubsub },
    );

    const classIds = classes.map((cls) => cls.id);
    const fieldRows =
      classIds.length > 0
        ? await ctx.db.select().from(dmsClassField).where(inArray(dmsClassField.class_id, classIds))
        : [];

    const byClass = new Map<string, ClassFieldRow[]>();
    for (const row of fieldRows) {
      if (!row.is_active) {
        continue;
      }
      const list = byClass.get(row.class_id) ?? [];
      list.push(row);
      byClass.set(row.class_id, list);
    }

    const candidateReport = classes.map((cls) => {
      const fields = byClass.get(cls.id) ?? [];
      const { missing } = validateFieldValues(fields, file.field_values ?? undefined);
      return { classId: cls.id, className: cls.name, missing };
    });

    return { file, missingRequiredFields: candidateReport };
  });
