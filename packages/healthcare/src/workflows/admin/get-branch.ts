import { BranchIdSchema } from "#/schemas/admin";
import { fetchBranchStep, toBranchDto } from "#/workflow-steps/fetch-admin";
import { findBranchIdBySubdomain } from "#/workflows/shared/branch-lifecycle";

import { Workflow } from "@aspen-os/platform/server";
import { object, optional, parse, string } from "valibot";

const GetBranchSchema = object({
  id: optional(string()),
  subdomain: optional(string()),
});

const GetBranchInputSchema = object({ input: GetBranchSchema });

export const getBranch = Workflow.name("healthcare.admin.get-branch")
  .input(GetBranchInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(GetBranchSchema, input);
    if (parsed.id) {
      const row = await ctx.step.run(fetchBranchStep, {
        id: parse(BranchIdSchema, { id: parsed.id }).id,
      });
      return toBranchDto(row);
    }
    if (parsed.subdomain) {
      const id = await ctx.step.run("resolve-subdomain", async () =>
        findBranchIdBySubdomain(ctx.db, parsed.subdomain ?? ""),
      );
      if (!id) {
        throw new Error(`Branch with subdomain "${parsed.subdomain}" not found.`);
      }
      const row = await ctx.step.run(fetchBranchStep, { id });
      return toBranchDto(row);
    }
    throw new Error("Branch lookup needs an id or a subdomain.");
  });
