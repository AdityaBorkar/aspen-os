import { complianceVerificationRule } from "#/db-schemas";
import { CreateVerificationRuleSchema } from "#/schemas";

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
        assigned_reviewer: parsed.assignedReviewer ?? null,
        category: parsed.category ?? null,
        is_active: parsed.isActive ?? true,
        name: parsed.name,
        priority: parsed.priority ?? 0,
        required_reviewer_role: parsed.requiredReviewerRole ?? null,
        source_module: parsed.sourceModule ?? null,
      })
      .returning();

    if (!result) {
      throw new Error("Database operation returned no result");
    }

    await ctx.audit.write({
      action: "created",
      actorId: ctx.actorId,
      crudAction: "create",
      entityId: result.id,
      entityType: "verification_rule",
      newState: result,
    });

    return result;
  });

export { createVerificationRule };
