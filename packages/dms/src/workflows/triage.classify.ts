import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

import { dmsDocument, dmsDocumentClass } from "../db-schemas";
import { DOCUMENT_EVENTS } from "../pubsub";
import {
  getActiveFields,
  renderFileNamingSchema,
  validateFieldValues,
} from "../services/classify-service";
import { ClassifyDocumentSchema, IdSchema } from "../types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "../utils/constants";
import { fetchDocumentStep } from "./steps/fetch-document";

const ClassifyInputSchema = object({
  id: IdSchema,
  input: ClassifyDocumentSchema,
});

export const classifyDocument = Workflow.name("dms.triage.classify")
  .input(ClassifyInputSchema)
  .handler(async ({ id, input }, ctx) => {
    const doc = await ctx.step.run(fetchDocumentStep, { documentId: id });

    if (doc.status !== "triaged") {
      throw new Error(
        `Document "${id}" is not in triage (status is "${doc.status}").`,
      );
    }

    const cls = await ctx.step.run("fetch-class", async () => {
      const [row] = await ctx.db
        .select()
        .from(dmsDocumentClass)
        .where(eq(dmsDocumentClass.id, input.classId))
        .limit(1);
      if (!row) {
        throw new Error(`Document class "${input.classId}" not found.`);
      }
      if (!row.isActive) {
        throw new Error(`Document class "${input.classId}" is archived.`);
      }
      return row;
    });

    const fields = await ctx.step.run("get-fields", async () =>
      getActiveFields(ctx.db, cls.id),
    );

    const validation = validateFieldValues(fields, input.fieldValues);
    if (validation.errors.length > 0) {
      throw new Error(
        `Classification failed: ${validation.errors.map((e) => e.message).join(" ")}`,
      );
    }

    const resolvedFieldValues = await ctx.step.run(
      "resolve-field-values",
      async () => {
        const values: Record<string, unknown> = {
          ...(input.fieldValues ?? {}),
        };
        for (const field of fields) {
          if (
            values[field.name] === undefined &&
            field.defaultValue !== null &&
            field.defaultValue !== undefined
          ) {
            values[field.name] = field.defaultValue;
          }
        }
        return values;
      },
    );

    const oldName = doc.name;
    const newName =
      (await ctx.step.run("render-file-name", async () =>
        renderFileNamingSchema({
          className: cls.name,
          docNumber: doc.docNumber,
          fieldValues: resolvedFieldValues,
          originalName: oldName,
          schema: cls.fileNamingSchema,
        }),
      )) ?? oldName;

    const [updated] = await ctx.db
      .update(dmsDocument)
      .set({
        classId: cls.id,
        fieldValues: resolvedFieldValues,
        name: newName,
        status: "active",
        updatedAt: new Date(),
      })
      .where(eq(dmsDocument.id, id))
      .returning();

    if (!updated) {
      throw new Error(`Document with id "${id}" not found.`);
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CLASSIFIED,
        changes: { className: cls.name, name: newName },
        crudAction: "update",
        entityId: id,
        entityType: AUDIT_ENTITY_TYPE.DOCUMENT,
        newState: {
          classId: cls.id,
          fieldValues: resolvedFieldValues,
          name: newName,
          status: "active",
        },
        previousState: { classId: null, name: oldName, status: "triaged" },
      });

      await ctx.pubsub.publish(DOCUMENT_EVENTS.CLASSIFIED, {
        classId: cls.id,
        docNumber: updated.docNumber,
        documentId: id,
      });
    });

    return updated;
  });
