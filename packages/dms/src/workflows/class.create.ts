import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

import { dmsClass } from "../db-schemas";
import { CLASS_EVENTS } from "../pubsub";
import { CreateClassSchema } from "../types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "../utils/constants";

const CreateInputSchema = object({ input: CreateClassSchema });

export const createClass = Workflow.name("dms.class.create")
  .input(CreateInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateClassSchema, input);

    const [cls] = await ctx.db
      .insert(dmsClass)
      .values({
        color: parsed.color ?? null,
        createdBy: parsed.createdBy,
        description: parsed.description ?? null,
        fileNamingSchema: parsed.fileNamingSchema ?? null,
        icon: parsed.icon ?? null,
        name: parsed.name,
        retentionDays: parsed.retentionDays ?? null,
      })
      .returning();

    if (!cls) {
      throw new Error("Failed to create class.");
    }

    await ctx.audit.write({
      action: AUDIT_ACTION.UPDATED,
      crudAction: "create",
      entityId: cls.id,
      entityType: AUDIT_ENTITY_TYPE.CLASS,
      newState: { id: cls.id, isActive: cls.isActive, name: cls.name },
    });

    await ctx.pubsub.publish(CLASS_EVENTS.CREATED, { classId: cls.id });

    return cls;
  });
