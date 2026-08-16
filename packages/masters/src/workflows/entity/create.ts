import { masterEntity } from "#/db-schemas";
import { ENTITY_EVENTS } from "#/pubsub";
import { CreateEntitySchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse } from "valibot";

const CreateInputSchema = object({ input: CreateEntitySchema });

export const createEntity = Workflow.name("masters.entity.create")
  .input(CreateInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateEntitySchema, input);

    const { code } = parsed;
    if (code) {
      await ctx.step.run("assert-code-unique", async () => {
        const [existing] = await ctx.db
          .select({ id: masterEntity.id })
          .from(masterEntity)
          .where(eq(masterEntity.code, code))
          .limit(1);

        if (existing) {
          throw new Error(`Entity with code "${code}" already exists.`);
        }
      });
    }

    const [entity] = await ctx.db
      .insert(masterEntity)
      .values({
        code: parsed.code ?? null,
        email: parsed.email ?? null,
        foundedDate: parsed.foundedDate?.toISOString().split("T")[0] ?? null,
        industry: parsed.industry ?? null,
        locale: parsed.locale ?? null,
        metadata: parsed.metadata ?? null,
        name: parsed.name,
        organizationId: parsed.organizationId ?? null,
        phone: parsed.phone ?? null,
        registrationNumber: parsed.registrationNumber ?? null,
        status: parsed.status,
        taxId: parsed.taxId ?? null,
        timezone: parsed.timezone ?? null,
        type: parsed.type,
        website: parsed.website ?? null,
      })
      .returning();

    if (!entity) {
      throw new Error("Failed to create entity.");
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: entity.id,
        entityType: AUDIT_ENTITY_TYPE.ENTITY,
        newState: {
          code: entity.code,
          name: entity.name,
          status: entity.status,
          type: entity.type,
        },
      });

      await ctx.pubsub.publish(ENTITY_EVENTS.CREATED, {
        entity: { id: entity.id, name: entity.name, type: entity.type },
      });
    });

    return entity;
  });
