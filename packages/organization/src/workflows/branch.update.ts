import { isValidCountryCode } from "@aspen-os/constants";
import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, string } from "valibot";

import { branch } from "../db-schemas";
import { BRANCH_EVENTS } from "../pubsub";
import { UpdateBranchSchema } from "../types";
import { fetchBranchStep } from "../workflow-steps/fetch-branch";
import { ensureCodeUnique, ensureNoHeadquartersExists, validateParentBranch } from "./utils";

const UpdateInputSchema = object({
  id: string(),
  patch: UpdateBranchSchema,
});

export const updateBranch = Workflow.name("branch.update")
  .input(UpdateInputSchema)
  .handler(async (input, ctx) => {
    const current = await ctx.step.run(fetchBranchStep, { id: input.id });

    if (input.patch.code !== undefined) {
      await ensureCodeUnique(ctx.db, input.patch.code, input.id);
    }

    if (input.patch.country !== undefined && !isValidCountryCode(input.patch.country)) {
      throw new Error(
        `Invalid country code: "${input.patch.country}". Must be ISO 3166-1 alpha-2.`,
      );
    }

    if (input.patch.type === "headquarters" && current.type !== "headquarters") {
      await ensureNoHeadquartersExists(ctx.db, input.id);
    }

    if (input.patch.parentBranch !== undefined && input.patch.parentBranch !== null) {
      if (input.patch.parentBranch === input.id) {
        throw new Error("A branch cannot be its own parent.");
      }
      await validateParentBranch(ctx.db, input.patch.parentBranch, input.id);
    }

    const [updated] = await ctx.db
      .update(branch)
      .set({
        addressLine1: input.patch.addressLine1,
        addressLine2: input.patch.addressLine2,
        capacity: input.patch.capacity,
        city: input.patch.city,
        closedDate: input.patch.closedDate?.toISOString().split("T")[0] ?? undefined,
        code: input.patch.code?.toUpperCase(),
        country: input.patch.country?.toUpperCase(),
        email: input.patch.email,
        isActive: input.patch.isActive,
        manager: input.patch.manager,
        metadata: input.patch.metadata,
        name: input.patch.name,
        notes: input.patch.notes,
        openedDate: input.patch.openedDate?.toISOString().split("T")[0] ?? undefined,
        parentBranch: input.patch.parentBranch,
        phone: input.patch.phone,
        postalCode: input.patch.postalCode,
        state: input.patch.state,
        timezone: input.patch.timezone,
        type: input.patch.type,
        updatedAt: new Date(),
      })
      .where(eq(branch.id, input.id))
      .returning();

    if (!updated) {
      throw new Error(`Branch with id "${input.id}" not found.`);
    }

    await ctx.pubsub.publish(BRANCH_EVENTS.UPDATED, {
      branch: { id: updated.id, name: updated.name },
      changes: input.patch as Record<string, unknown>,
    });

    return updated;
  });
