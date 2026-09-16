import { healthcareYogaBatch } from "#/db-schemas/ayush";
import { AYUSH_EVENTS } from "#/pubsub";
import { CreateYogaBatchSchema } from "#/schemas/ayush";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const CreateYogaBatchInputSchema = object({ input: CreateYogaBatchSchema });

export const createYogaBatch = Workflow.name("emr.ayush.create-yoga-batch")
  .input(CreateYogaBatchInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateYogaBatchSchema, input);
    const branchId = parsed.branchId ?? "main";
    const actorId = ctx.actorId ?? "system";

    const [row] = await ctx.step.run("insert-yoga-batch", async () =>
      ctx.db
        .insert(healthcareYogaBatch)
        .values({
          branch_id: branchId,
          capacity: parsed.capacity,
          created_by: actorId,
          name: parsed.name,
          schedule: parsed.schedule,
        })
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to create the yoga batch.");
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.AYUSH,
        newState: {
          capacity: row.capacity,
          id: row.id,
          name: row.name,
        },
      });
      await ctx.pubsub.publish(AYUSH_EVENTS.CREATED, {
        actorId,
        at: new Date().toISOString(),
        branchId,
        id: row.id,
      });
    });

    return {
      branchId: row.branch_id,
      capacity: row.capacity,
      createdAt: row.created_at.toISOString(),
      id: row.id,
      name: row.name,
      schedule: row.schedule,
    };
  });
