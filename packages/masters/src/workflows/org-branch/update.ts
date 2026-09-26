import { orgBranch } from "#/db-schemas";
import { ORG_BRANCH_EVENTS } from "#/pubsub";
import { UpdateOrgBranchSchema } from "#/types";
import { stripUndefined } from "#/utils/strip-undefined";
import { fetchOrgBranchStep } from "#/workflow-steps/fetch-org-branch";
import {
  assertAddressReference,
  assertContactReference,
  ensureNoHeadquartersExists,
  ensureOrgBranchCodeUnique,
  validateParentOrgBranch,
} from "#/workflows/org-branch/utils";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, string } from "valibot";

const UpdateInputSchema = object({
  id: string(),
  patch: UpdateOrgBranchSchema,
});

export const updateOrgBranch = Workflow.name("masters.org_branch.update")
  .input(UpdateInputSchema)
  .handler(async (input, ctx) => {
    const current = await ctx.step.run(fetchOrgBranchStep, { id: input.id });

    if (input.patch.code !== undefined) {
      await ensureOrgBranchCodeUnique(ctx.db, input.patch.code, input.id);
    }

    if (input.patch.type === "headquarters" && current.type !== "headquarters") {
      await ensureNoHeadquartersExists(ctx.db, input.id);
    }

    if (input.patch.parentOrgBranch !== undefined && input.patch.parentOrgBranch !== null) {
      await validateParentOrgBranch(ctx.db, input.patch.parentOrgBranch, input.id);
    }

    await assertAddressReference(ctx.db, input.patch.billingAddressId);
    await assertAddressReference(ctx.db, input.patch.locationAddressId);
    await assertContactReference(ctx.db, input.patch.billingContactId);
    await assertContactReference(ctx.db, input.patch.locationContactId);

    const values = stripUndefined({
      billing_address_id: input.patch.billingAddressId,
      billing_contact_id: input.patch.billingContactId,
      code: input.patch.code?.toUpperCase(),
      gstin: input.patch.gstin,
      location_address_id: input.patch.locationAddressId,
      location_contact_id: input.patch.locationContactId,
      metadata: input.patch.metadata,
      name: input.patch.name,
      parent_org_branch: input.patch.parentOrgBranch,
      type: input.patch.type,
    });

    const [updated] = await ctx.db
      .update(orgBranch)
      .set({ ...values, updated_at: new Date() })
      .where(eq(orgBranch.id, input.id))
      .returning();

    if (!updated) {
      throw new Error(`Org branch with id "${input.id}" not found.`);
    }

    await ctx.pubsub.publish(ORG_BRANCH_EVENTS.UPDATED, {
      changes: values,
      orgBranch: { id: updated.id, name: updated.name },
    });

    return updated;
  });
