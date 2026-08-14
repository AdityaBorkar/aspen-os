import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse, string } from "valibot";

import { dmsPublicLink } from "../db-schemas";
import { UpdatePublicLinkSchema } from "../types";

const UpdateInputSchema = object({
  id: string(),
  input: UpdatePublicLinkSchema,
});

export const updatePublicLink = Workflow.name("dms.public-link.update")
  .input(UpdateInputSchema)
  .handler(async ({ id, input }, ctx) => {
    const parsed = parse(UpdatePublicLinkSchema, input);

    const updates: Record<string, unknown> = {};

    if (parsed.permission !== undefined) {
      updates.permission = parsed.permission;
    }
    if (parsed.expiresAt !== undefined) {
      updates.expiresAt = parsed.expiresAt;
    }
    if (parsed.isActive !== undefined) {
      updates.isActive = parsed.isActive;
    }
    if (parsed.maxViews !== undefined) {
      updates.maxViews = parsed.maxViews;
    }
    if (parsed.password !== undefined) {
      updates.password = parsed.password ? await Bun.password.hash(parsed.password) : null;
    }

    const [updated] = await ctx.db
      .update(dmsPublicLink)
      .set(updates)
      .where(eq(dmsPublicLink.id, id))
      .returning();

    if (!updated) {
      throw new Error(`Public link with id "${id}" not found.`);
    }

    return updated;
  });
