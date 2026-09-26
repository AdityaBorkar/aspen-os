import { orgBranch } from "#/db-schemas";
import { ORG_BRANCH_EVENTS } from "#/pubsub";
import { CreateOrgBranchSchema } from "#/types";
import {
  assertAddressReference,
  assertContactReference,
  ensureNoHeadquartersExists,
  ensureOrgBranchCodeUnique,
  validateParentOrgBranch,
} from "#/workflows/org-branch/utils";

import { Workflow } from "@aspen-os/platform/server";

export const createOrgBranch = Workflow.name("masters.org_branch.create")
  .input(CreateOrgBranchSchema)
  .handler(async (input, ctx) => {
    await ensureOrgBranchCodeUnique(ctx.db, input.code);

    if (input.type === "headquarters") {
      await ensureNoHeadquartersExists(ctx.db);
    }

    if (input.parentOrgBranch) {
      await validateParentOrgBranch(ctx.db, input.parentOrgBranch);
    }

    await assertAddressReference(ctx.db, input.billingAddressId);
    await assertAddressReference(ctx.db, input.locationAddressId);
    await assertContactReference(ctx.db, input.billingContactId);
    await assertContactReference(ctx.db, input.locationContactId);

    const [result] = await ctx.db
      .insert(orgBranch)
      .values({
        billing_address_id: input.billingAddressId ?? null,
        billing_contact_id: input.billingContactId ?? null,
        code: input.code.toUpperCase(),
        gstin: input.gstin ?? null,
        location_address_id: input.locationAddressId ?? null,
        location_contact_id: input.locationContactId ?? null,
        metadata: input.metadata ?? null,
        name: input.name,
        parent_org_branch: input.parentOrgBranch ?? null,
        type: input.type,
      })
      .returning();

    if (!result) {
      throw new Error("Failed to create org branch.");
    }

    await ctx.pubsub.publish(ORG_BRANCH_EVENTS.CREATED, {
      orgBranch: {
        code: result.code,
        id: result.id,
        name: result.name,
        type: result.type,
      },
    });

    return result;
  });
