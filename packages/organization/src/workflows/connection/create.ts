import { connection } from "#/db-schemas";
import { CONNECTION_EVENTS } from "#/pubsub";
import { CreateConnectionSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

const CreateInputSchema = object({ input: CreateConnectionSchema });

export const createConnection = Workflow.name("connection.create")
  .input(CreateInputSchema)
  .handler(async ({ input }, ctx) => {
    const [result] = await ctx.db
      .insert(connection)
      .values({
        address: input.address ?? null,
        annualRevenue: input.annualRevenue?.toString() ?? null,
        contactEmail: input.contactEmail ?? null,
        contactPerson: input.contactPerson ?? null,
        contactPhone: input.contactPhone ?? null,
        contractValue: input.contractValue?.toString() ?? null,
        createdBy: input.createdBy,
        industry: input.industry ?? null,
        logo: input.logo ?? null,
        metadata: input.metadata ?? null,
        name: input.name,
        notes: input.notes ?? null,
        relationshipEndDate: input.relationshipEndDate?.toISOString().split("T")[0] ?? null,
        relationshipStartDate: input.relationshipStartDate?.toISOString().split("T")[0] ?? null,
        tags: input.tags ?? [],
        taxId: input.taxId ?? null,
        type: input.type,
        website: input.website ?? null,
      })
      .returning();

    if (!result) {
      throw new Error("Failed to create connection.");
    }

    await ctx.pubsub.publish(CONNECTION_EVENTS.CREATED, {
      connection: {
        id: result.id,
        name: result.name,
        type: result.type,
      },
    });

    return result;
  });
