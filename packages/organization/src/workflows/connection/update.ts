import { connection } from "#/db-schemas";
import { CONNECTION_EVENTS } from "#/pubsub";
import { UpdateConnectionSchema } from "#/types";
import { fetchConnectionStep } from "#/workflow-steps/fetch-connection";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, string } from "valibot";

const UpdateInputSchema = object({
  id: string(),
  patch: UpdateConnectionSchema,
});

export const updateConnection = Workflow.name("connection.update")
  .input(UpdateInputSchema)
  .handler(async (input, ctx) => {
    await ctx.step.run(fetchConnectionStep, { id: input.id });

    const [updated] = await ctx.db
      .update(connection)
      .set({
        address: input.patch.address,
        annualRevenue: input.patch.annualRevenue?.toString(),
        contactEmail: input.patch.contactEmail,
        contactPerson: input.patch.contactPerson,
        contactPhone: input.patch.contactPhone,
        contractValue: input.patch.contractValue?.toString(),
        industry: input.patch.industry,
        logo: input.patch.logo,
        metadata: input.patch.metadata,
        name: input.patch.name,
        notes: input.patch.notes,
        relationshipEndDate:
          input.patch.relationshipEndDate?.toISOString().split("T")[0] ?? undefined,
        relationshipStartDate:
          input.patch.relationshipStartDate?.toISOString().split("T")[0] ?? undefined,
        tags: input.patch.tags,
        taxId: input.patch.taxId,
        type: input.patch.type,
        updatedAt: new Date(),
        website: input.patch.website,
      })
      .where(eq(connection.id, input.id))
      .returning();

    if (!updated) {
      throw new Error(`Connection with id "${input.id}" not found.`);
    }

    await ctx.pubsub.publish(CONNECTION_EVENTS.UPDATED, {
      changes: input.patch,
      connection: { id: updated.id, name: updated.name },
    });

    return updated;
  });
