import { healthcareBranch } from "#/db-schemas/branch";
import { BRANCH_EVENTS } from "#/pubsub";
import { CreateBranchSchema } from "#/schemas/admin";
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

const CreateBranchInputSchema = object({ input: CreateBranchSchema });

export const createBranch = Workflow.name("healthcare.admin.create-branch")
  .input(CreateBranchInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateBranchSchema, input);
    const subdomain = resolveBranchSubdomain(parsed.name, parsed.subdomain);
    await ctx.step.run("check-subdomain", async () => {
      await assertSubdomainFree(ctx.db, subdomain);
    });
    const [row] = await ctx.step.run("insert-branch", async () =>
      ctx.db
        .insert(healthcareBranch)
        .values({
          ...branchInsertValues({
            address: parsed.address,
            name: parsed.name,
            orgBranchCode: parsed.orgBranchCode,
            subdomain,
          }),
          id: crypto.randomUUID(),
          kind: "branch",
        })
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to create branch.");
    }
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.BRANCH,
        newState: { id: row.id, name: row.name, orgBranchCode: row.org_branch_code },
      });
      await ctx.pubsub.publish(BRANCH_EVENTS.CREATED, {
        actorId: ctx.actorId,
        at: new Date().toISOString(),
        branchId: branchEventScope(row),
        data: {
          orgBranchCode: row.org_branch_code ?? null,
          subdomain: row.subdomain,
        },
        id: row.id,
      });
    });
    return toBranchDto(row);
  });
