import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

import { connectionContact } from "../../../db-schemas";
import { CreateConnectionContactSchema } from "../../../types";
import { unsetPrimaryContacts } from "../../utils";

const CreateInputSchema = object({ input: CreateConnectionContactSchema });

export const createContact = Workflow.name("connection.create-contact")
  .input(CreateInputSchema)
  .handler(async ({ input }, ctx) => {
    if (input.isPrimary) {
      await unsetPrimaryContacts(ctx.db, input.connectionId);
    }

    const [result] = await ctx.db
      .insert(connectionContact)
      .values({
        connectionId: input.connectionId,
        email: input.email ?? null,
        isPrimary: input.isPrimary ?? false,
        name: input.name,
        notes: input.notes ?? null,
        phone: input.phone ?? null,
        title: input.title ?? null,
      })
      .returning();

    return result;
  });
