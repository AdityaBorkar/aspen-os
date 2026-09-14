import { healthcareStaffRole } from "#/db-schemas/staff";
import { OPERATIONS_EVENTS } from "#/pubsub";
import { CreateRoleSchema } from "#/schemas/staff";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const CreateRoleInputSchema = object({ input: CreateRoleSchema });

export const createRole = Workflow.name("healthcare.staff.create-role")
  .input(CreateRoleInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateRoleSchema, input);
    const branchId = parsed.branchId ?? "main";
    const [row] = await ctx.step.run("insert-role", async () =>
      ctx.db
        .insert(healthcareStaffRole)
        .values({
          branch_id: branchId,
          name: parsed.name,
          permissions: parsed.permissions ?? [],
        })
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to create role.");
    }
    const at = new Date().toISOString();
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.OPERATIONS,
        newState: { name: row.name },
      });
      await ctx.pubsub.publish(OPERATIONS_EVENTS.CREATED, {
        actorId: ctx.actorId,
        at,
        branchId,
        id: row.id,
      });
    });
    return { id: row.id, name: row.name, permissions: row.permissions };
  });
