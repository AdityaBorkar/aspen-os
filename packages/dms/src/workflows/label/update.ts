import { assertLabelOwner, IdSchema, UpdateLabelSchema } from "#/types";
import { stripUndefined } from "#/utils/strip-undefined";

import { masterLabel } from "@aspen-os/masters";
import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse } from "valibot";

const UpdateInputSchema = object({ id: IdSchema, input: UpdateLabelSchema });

export const updateLabel = Workflow.name("dms.label.update")
  .input(UpdateInputSchema)
  .handler(async ({ id, input }, ctx) => {
    const parsed = parse(UpdateLabelSchema, input);

    const rawUpdates = stripUndefined({
      color: parsed.color,
      isGlobal: parsed.isGlobal,
      name: parsed.name,
      ownerId: parsed.ownerId,
    });

    if (rawUpdates.isGlobal !== undefined || rawUpdates.ownerId !== undefined) {
      const [current] = await ctx.db
        .select({ scopeId: masterLabel.scope_id, scopeType: masterLabel.scope_type })
        .from(masterLabel)
        .where(eq(masterLabel.id, id))
        .limit(1);
      const currentIsGlobal = current ? current.scopeType == null : undefined;
      const currentOwnerId = current?.scopeId ?? null;
      const effectiveGlobal = rawUpdates.isGlobal ?? currentIsGlobal;
      const effectiveOwner = rawUpdates.ownerId !== undefined ? rawUpdates.ownerId : currentOwnerId;
      assertLabelOwner(effectiveGlobal, effectiveOwner);
    }

    // SAFETY: updates holds only validated label columns (color, name, scope) from parsed input.
    const updates: Record<string, string | null> = {};
    if (rawUpdates.color !== undefined) {
      updates.color = rawUpdates.color ?? null;
    }
    if (rawUpdates.name !== undefined) {
      updates.name = rawUpdates.name ?? null;
    }
    if (rawUpdates.isGlobal !== undefined || rawUpdates.ownerId !== undefined) {
      const { isGlobal } = rawUpdates;
      const { ownerId } = rawUpdates;
      // Resolve effective scope from rawUpdates; if only one provided, keep current for the other.
      // We already validated above, now compute final scope values for the update.
      // If isGlobal is explicitly provided, it determines scope; otherwise keep current scope.
      if (isGlobal !== undefined) {
        if (isGlobal) {
          updates.scope_type = null;
          updates.scope_id = null;
        } else if (ownerId !== undefined) {
          updates.scope_type = "user";
          updates.scope_id = ownerId;
        } else {
          // isGlobal false but ownerId not in patch -> keep existing ownerId, but need to fetch current scope_id
          const [cur] = await ctx.db
            .select({ scopeId: masterLabel.scope_id })
            .from(masterLabel)
            .where(eq(masterLabel.id, id))
            .limit(1);
          updates.scope_type = "user";
          updates.scope_id = cur?.scopeId ?? null;
        }
      } else if (ownerId !== undefined) {
        updates.scope_type = "user";
        updates.scope_id = ownerId;
      }
    }

    if (Object.keys(updates).length === 0) {
      const [current] = await ctx.db
        .select()
        .from(masterLabel)
        .where(eq(masterLabel.id, id))
        .limit(1);
      if (!current) {
        throw new Error(`Label "${id}" not found.`);
      }
      return current;
    }

    const [updated] = await ctx.db
      .update(masterLabel)
      // SAFETY: updates typed as validated label fields, compatible with masterLabel columns.
      .set({ ...updates, updated_at: new Date() })
      .where(eq(masterLabel.id, id))
      .returning();

    if (!updated) {
      throw new Error(`Label "${id}" not found.`);
    }

    return updated;
  });
