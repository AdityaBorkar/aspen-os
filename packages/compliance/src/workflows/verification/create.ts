import { complianceVerificationRule } from "#/db-schemas";
import { CreateVerificationRuleSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

const CreateInputSchema = object({ input: CreateVerificationRuleSchema });

const createVerificationRule = Workflow.name("verification.create")
  .input(CreateInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = input;

    const [result] = await ctx.db
      .insert(complianceVerificationRule)
      .values({
        assignedReviewer: parsed.assignedReviewer ?? null,
        category: parsed.category ?? null,
        isActive: parsed.isActive ?? true,
        name: parsed.name,
        priority: parsed.priority ?? 0,
        requiredReviewerRole: parsed.requiredReviewerRole ?? null,
        sourceModule: parsed.sourceModule ?? null,
      })
      .returning();

    if (!result) {
      throw new Error("Database operation returned no result");
    }

    await ctx.audit.write({
      action: "created",
      crudAction: "create",
      entityId: result.id,
      entityType: "verification_rule",
      newState: result as unknown as Record<string, unknown>,
    });

    return result;
  });

export { createVerificationRule };
