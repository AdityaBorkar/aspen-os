import { healthcareBranch } from "#/db-schemas/branch";
import { BRANCH_EVENTS } from "#/pubsub";
import { CreateBranchSchema } from "#/schemas/admin";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { toBranchDto } from "#/workflow-steps/fetch-admin";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse } from "valibot";

const CreateBranchInputSchema = object({ input: CreateBranchSchema });

export const createBranch = Workflow.name("healthcare.admin.create-branch")
  .input(CreateBranchInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateBranchSchema, input);
    const taken = await ctx.step.run("check-subdomain", async () => {
      const [row] = await ctx.db
        .select({ id: healthcareBranch.id })
        .from(healthcareBranch)
        .where(eq(healthcareBranch.subdomain, parsed.subdomain))
        .limit(1);
      return row ?? null;
    });
    if (taken) {
      throw new Error(`Subdomain "${parsed.subdomain}" is already taken by branch ${taken.id}.`);
    }
    const [row] = await ctx.step.run("insert-branch", async () =>
      ctx.db
        .insert(healthcareBranch)
        .values({
          branch_id: "main",
          id: crypto.randomUUID(),
          kind: "branch",
          name: parsed.name,
          payload: parsed.address ? { address: parsed.address } : {},
          status: "active",
          subdomain: parsed.subdomain,
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
        newState: { id: row.id, name: row.name },
      });
      await ctx.pubsub.publish(BRANCH_EVENTS.CREATED, {
        actorId: ctx.actorId,
        at: new Date().toISOString(),
        branchId: row.id,
        id: row.id,
      });
    });
    return toBranchDto(row);
  });
