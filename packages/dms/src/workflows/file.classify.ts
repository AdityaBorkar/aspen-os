import { Workflow } from "@aspen-os/platform/server";
import { count, eq, isNotNull } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { object, parse } from "valibot";

import { dmsClass, dmsFile } from "../db-schemas";
import { FILE_EVENTS } from "../pubsub";
import {
  getActiveFields,
  renderFileNamingSchema,
  validateFieldValues,
} from "../services/classify-service";
import { ClassifyFileSchema, IdSchema } from "../types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "../utils/constants";
import { fetchFileStep } from "../workflow-steps/fetch-file";

const ClassifyInputSchema = object({ id: IdSchema, input: ClassifyFileSchema });

const MAX_SEQ = 999999;

async function nextDocNumber(db: NodePgDatabase): Promise<string> {
  const rows = await db
    .select({ value: count(dmsFile.id) })
    .from(dmsFile)
    .where(isNotNull(dmsFile.docNumber));
  const value = rows[0]?.value ?? 0;
  const seq = (value + 1) % (MAX_SEQ + 1);
  return `DOC-${String(seq).padStart(6, "0")}`;
}

export const classifyFile = Workflow.name("dms.file.classify")
  .input(ClassifyInputSchema)
  .handler(async ({ id, input }, ctx) => {
    const file = await ctx.step.run(fetchFileStep, { id });

    if (file.status !== "triaged") {
      throw new Error(`File "${id}" must be in triage to be classified.`);
    }

    const parsed = parse(ClassifyFileSchema, input);

    const cls = await ctx.step.run("fetch-class", async () => {
      const [row] = await ctx.db
        .select()
        .from(dmsClass)
        .where(eq(dmsClass.id, parsed.classId))
        .limit(1);
      if (!row) {
        throw new Error(`Class "${parsed.classId}" not found.`);
      }
      if (!row.isActive) {
        throw new Error(`Class "${parsed.classId}" is archived.`);
      }
      return row;
    });

    const fields = await ctx.step.run("get-fields", async () => getActiveFields(ctx.db, cls.id));

    const resolvedValues = await ctx.step.run("resolve-field-values", async () => {
      const values: Record<string, unknown> = {};
      for (const field of fields) {
        values[field.name] = parsed.fieldValues?.[field.name] ?? field.defaultValue ?? null;
      }
      return values;
    });

    const validation = validateFieldValues(fields, resolvedValues);
    if (validation.errors.length > 0 || validation.missing.length > 0) {
      throw new Error(
        `File "${id}" failed classification: ${validation.errors.map((error) => error.message).join(" ")}`,
      );
    }

    const docNumber = await ctx.step.run("next-doc-number", async () => nextDocNumber(ctx.db));

    const newName = await ctx.step.run("render-file-name", async () => {
      const rendered = renderFileNamingSchema({
        className: cls.name,
        docNumber,
        fieldValues: resolvedValues,
        originalName: file.name,
        schema: cls.fileNamingSchema,
      });
      return rendered ?? file.name;
    });

    const [updated] = await ctx.db
      .update(dmsFile)
      .set({
        classId: cls.id,
        docNumber,
        fieldValues: resolvedValues,
        name: newName,
        status: "active",
        updatedAt: new Date(),
      })
      .where(eq(dmsFile.id, id))
      .returning();

    if (!updated) {
      throw new Error(`File "${id}" not found.`);
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CLASSIFIED,
        changes: ctx.audit.diff(
          { className: null, name: file.name },
          { className: cls.name, name: newName },
        ),
        crudAction: "update",
        entityId: id,
        entityType: AUDIT_ENTITY_TYPE.FILE,
        newState: { classId: cls.id, fieldValues: resolvedValues, name: newName, status: "active" },
        previousState: { classId: null, name: file.name, status: "triaged" },
      });

      await ctx.pubsub.publish(FILE_EVENTS.CLASSIFIED, {
        classId: cls.id,
        docNumber,
        fileId: id,
      });
    });

    return updated ?? file;
  });
