import { organization } from "#/db-schemas";
import { fetchOrganizationStep } from "#/workflow-steps/fetch-organization";

import type { WorkflowContext } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";

type OrganizationRow = typeof organization.$inferSelect;
type OrganizationValues = Partial<typeof organization.$inferInsert>;

/** Fetch the single organization or throw. Shared by every org mutation. */
export async function requireCurrentOrganization(
  step: WorkflowContext["step"],
): Promise<OrganizationRow> {
  const current = await step.run(fetchOrganizationStep, {});
  if (!current) {
    throw new Error("Organization not found. Create one first.");
  }
  return current;
}

/** Single writer for every organization mutation: fetch-once, update, return. */
export async function applyOrganizationUpdate(
  ctx: Pick<WorkflowContext, "db" | "step">,
  values: OrganizationValues,
): Promise<OrganizationRow> {
  const current = await requireCurrentOrganization(ctx.step);

  const [updated] = await ctx.db
    .update(organization)
    .set({ ...values, updated_at: new Date() })
    .where(eq(organization.id, current.id))
    .returning();

  if (!updated) {
    throw new Error("Failed to update organization.");
  }

  return updated;
}
