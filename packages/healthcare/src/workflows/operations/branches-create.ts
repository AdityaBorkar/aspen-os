import { healthcareBranch } from "#/db-schemas/branch";
import { BRANCH_EVENTS } from "#/pubsub";
import { CreateBranchSchema } from "#/schemas/operations";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const BranchesCreateInputSchema = object({ input: CreateBranchSchema });

export const branchesCreate = Workflow.name("healthcare.operations.branches-create")
  .input(BranchesCreateInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateBranchSchema, input);
    const subdomain = (
      parsed.slug ?? parsed.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")
    ).replace(/^-+|-+$/g, "");
    if (!subdomain) {
      throw new Error("Branch needs a usable slug; check the name and retry");
    }
    const [row] = await ctx.step.run("insert-branch", async () =>
      ctx.db
        .insert(healthcareBranch)
        .values({
          branch_id: "main",
          name: parsed.name,
          payload: parsed.address ? { address: parsed.address } : {},
          status: "active",
          subdomain,
        })
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to create branch.");
    }
    const at = new Date().toISOString();
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.BRANCH,
        newState: { name: row.name, subdomain: row.subdomain },
      });
      await ctx.pubsub.publish(BRANCH_EVENTS.CREATED, {
        actorId: ctx.actorId,
        at,
        branchId: "main",
        id: row.id,
      });
    });
    return { id: row.id, name: row.name, subdomain: row.subdomain };
  });
