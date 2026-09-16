import { healthcareBranch } from "#/db-schemas/branch";
import { BRANCH_EVENTS } from "#/pubsub";
import { UpdateBranchSchema } from "#/schemas/admin";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchBranchStep, toBranchDto } from "#/workflow-steps/fetch-admin";
import { branchEventScope } from "#/workflows/shared/branch-lifecycle";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse } from "valibot";

const UpdateBranchInputSchema = object({ input: UpdateBranchSchema });

export const updateBranch = Workflow.name("healthcare.admin.update-branch")
  .input(UpdateBranchInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(UpdateBranchSchema, input);
    const current = await ctx.step.run(fetchBranchStep, { id: parsed.id });
    const payload = { ...current.payload };
    if (parsed.patch.address !== undefined) {
      payload.address = parsed.patch.address;
    }
    const [row] = await ctx.step.run("update-branch", async () =>
      ctx.db
        .update(healthcareBranch)
        .set({
          name: parsed.patch.name ?? current.name,
          org_branch_code: parsed.patch.orgBranchCode ?? current.org_branch_code,
          payload,
          status: parsed.patch.status ?? current.status,
        })
        .where(eq(healthcareBranch.id, parsed.id))
        .returning(),
    );
    if (!row) {
      throw new Error(`Failed to update branch "${parsed.id}".`);
    }
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.UPDATED,
        crudAction: "update",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.BRANCH,
        newState: { id: row.id, name: row.name, orgBranchCode: row.org_branch_code },
      });
      await ctx.pubsub.publish(BRANCH_EVENTS.UPDATED, {
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
