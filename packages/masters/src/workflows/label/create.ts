import { masterLabel } from "#/db-schemas";
import { LABEL_EVENTS } from "#/pubsub";
import { CreateLabelSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const CreateInputSchema = object({ input: CreateLabelSchema });

export const createLabel = Workflow.name("masters.label.create")
  .input(CreateInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateLabelSchema, input);

    const [label] = await ctx.db
      .insert(masterLabel)
      .values({
        color: parsed.color ?? null,
        name: parsed.name,
        scope_id: parsed.scopeId ?? null,
        scope_type: parsed.scopeType ?? null,
      })
      .returning();

    if (!label) {
      throw new Error("Failed to create label.");
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: label.id,
        entityType: AUDIT_ENTITY_TYPE.LABEL,
        newState: {
          color: label.color,
          name: label.name,
          scopeId: label.scope_id,
          scopeType: label.scope_type,
        },
      });

      await ctx.pubsub.publish(LABEL_EVENTS.CREATED, {
        label: {
          color: label.color,
          id: label.id,
          name: label.name,
          scopeId: label.scope_id,
          scopeType: label.scope_type,
        },
      });
    });

    return label;
  });
