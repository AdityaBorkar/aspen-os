import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse } from "valibot";

import { dmsClass, dmsClassField } from "../db-schemas";
import { CLASS_EVENTS } from "../pubsub";
import { CreateClassFieldSchema } from "../types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "../utils/constants";

const AddFieldInputSchema = object({ input: CreateClassFieldSchema });

export const addClassField = Workflow.name("dms.class.add-field")
  .input(AddFieldInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateClassFieldSchema, input);

    const [cls] = await ctx.db
      .select({ id: dmsClass.id, isActive: dmsClass.isActive })
      .from(dmsClass)
      .where(eq(dmsClass.id, parsed.classId))
      .limit(1);

    if (!cls) {
      throw new Error(`Class "${parsed.classId}" not found.`);
    }
    if (!cls.isActive) {
      throw new Error(`Class "${parsed.classId}" is archived.`);
    }

    const [field] = await ctx.db
      .insert(dmsClassField)
      .values({
        classId: parsed.classId,
        defaultValue: parsed.defaultValue ?? null,
        includeInSearch: parsed.includeInSearch,
        isRequired: parsed.isRequired,
        label: parsed.label,
        name: parsed.name,
        options: parsed.options ?? null,
        sortOrder: parsed.sortOrder,
        type: parsed.type,
      })
      .returning();

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.UPDATED,
        crudAction: "create",
        entityId: parsed.classId,
        entityType: AUDIT_ENTITY_TYPE.CLASS,
        metadata: { fieldId: field?.id, fieldName: parsed.name },
        newState: {
          fieldName: parsed.name,
          isRequired: parsed.isRequired,
          type: parsed.type,
        },
      });

      await ctx.pubsub.publish(CLASS_EVENTS.UPDATED, {
        classId: parsed.classId,
      });
    });

    return field;
  });
