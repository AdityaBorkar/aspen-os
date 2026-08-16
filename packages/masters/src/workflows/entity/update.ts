import { masterEntity } from "#/db-schemas";
import { ENTITY_EVENTS } from "#/pubsub";
import { UpdateEntitySchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchEntityStep } from "#/workflow-steps/fetch-entity";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq, ne } from "drizzle-orm";
import { object, string } from "valibot";

const UpdateInputSchema = object({
  id: string(),
  patch: UpdateEntitySchema,
});

export const updateEntity = Workflow.name("masters.entity.update")
  .input(UpdateInputSchema)
  .handler(async (input, ctx) => {
    const current = await ctx.step.run(fetchEntityStep, { id: input.id });

    const { code } = input.patch;
    if (code && code !== current.code) {
      await ctx.step.run("assert-code-unique", async () => {
        const [existing] = await ctx.db
          .select({ id: masterEntity.id })
          .from(masterEntity)
          .where(and(eq(masterEntity.code, code), ne(masterEntity.id, input.id)))
          .limit(1);

        if (existing) {
          throw new Error(`Entity with code "${code}" already exists.`);
        }
      });
    }

    const [updated] = await ctx.db
      .update(masterEntity)
      .set({
        code: input.patch.code,
        email: input.patch.email,
        foundedDate: input.patch.foundedDate?.toISOString().split("T")[0] ?? undefined,
        industry: input.patch.industry,
        locale: input.patch.locale,
        metadata: input.patch.metadata,
        name: input.patch.name,
        organizationId: input.patch.organizationId,
        phone: input.patch.phone,
        registrationNumber: input.patch.registrationNumber,
        status: input.patch.status,
        taxId: input.patch.taxId,
        timezone: input.patch.timezone,
        type: input.patch.type,
        updatedAt: new Date(),
        website: input.patch.website,
      })
      .where(eq(masterEntity.id, input.id))
      .returning();

    if (!updated) {
      throw new Error(`Entity with id "${input.id}" not found.`);
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.UPDATED,
        changes: input.patch,
        crudAction: "update",
        entityId: updated.id,
        entityType: AUDIT_ENTITY_TYPE.ENTITY,
      });

      await ctx.pubsub.publish(ENTITY_EVENTS.UPDATED, {
        changes: input.patch,
        entity: { id: updated.id, name: updated.name, type: updated.type },
      });
    });

    return updated;
  });
