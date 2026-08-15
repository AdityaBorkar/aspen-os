import { branch } from "#/db-schemas";
import { BRANCH_EVENTS } from "#/pubsub";
import { CreateBranchSchema } from "#/types";
import { ensureNoHeadquartersExists, validateParentBranch } from "#/workflows/utils";

import { isValidCountryCode } from "@aspen-os/constants";
import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

const CreateInputSchema = object({ input: CreateBranchSchema });

export const createBranch = Workflow.name("branch.create")
  .input(CreateInputSchema)
  .handler(async ({ input }, ctx) => {
    if (!isValidCountryCode(input.country)) {
      throw new Error(`Invalid country code: "${input.country}". Must be ISO 3166-1 alpha-2.`);
    }

    if (input.type === "headquarters") {
      await ensureNoHeadquartersExists(ctx.db);
    }

    if (input.parentBranch) {
      await validateParentBranch(ctx.db, input.parentBranch);
    }

    const [result] = await ctx.db
      .insert(branch)
      .values({
        addressLine1: input.addressLine1,
        addressLine2: input.addressLine2 ?? null,
        capacity: input.capacity ?? null,
        city: input.city,
        closedDate: input.closedDate?.toISOString().split("T")[0] ?? null,
        code: input.code.toUpperCase(),
        country: input.country.toUpperCase(),
        email: input.email ?? null,
        manager: input.manager ?? null,
        metadata: input.metadata ?? null,
        name: input.name,
        notes: input.notes ?? null,
        openedDate: input.openedDate?.toISOString().split("T")[0] ?? null,
        parentBranch: input.parentBranch ?? null,
        phone: input.phone ?? null,
        postalCode: input.postalCode ?? null,
        state: input.state ?? null,
        timezone: input.timezone ?? null,
        type: input.type,
      })
      .returning();

    if (!result) {
      throw new Error("Failed to create branch.");
    }

    await ctx.pubsub.publish(BRANCH_EVENTS.CREATED, {
      branch: {
        code: result.code,
        id: result.id,
        name: result.name,
        type: result.type,
      },
    });

    return result;
  });
