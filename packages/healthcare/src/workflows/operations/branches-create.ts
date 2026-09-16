import { healthcareBranch } from "#/db-schemas/branch";
import { BRANCH_EVENTS } from "#/pubsub";
import { CreateBranchSchema } from "#/schemas/operations";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { toBranchDto } from "#/workflow-steps/fetch-admin";
import {
  assertSubdomainFree,
  branchEventScope,
  branchInsertValues,
  resolveBranchSubdomain,
} from "#/workflows/shared/branch-lifecycle";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const BranchesCreateInputSchema = object({ input: CreateBranchSchema });

export const branchesCreate = Workflow.name("healthcare.operations.branches-create")
  .input(BranchesCreateInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateBranchSchema, input);
    const subdomain = resolveBranchSubdomain(parsed.name, parsed.slug);
    await ctx.step.run("check-subdomain", async () => {
      await assertSubdomainFree(ctx.db, subdomain);
    });
    const [row] = await ctx.step.run("insert-branch", async () =>
      ctx.db
        .insert(healthcareBranch)
        .values(branchInsertValues(parsed.name, parsed.address, subdomain))
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
        branchId: branchEventScope(row),
        id: row.id,
      });
    });
    return toBranchDto(row);
  });
