import { masterAddress } from "#/db-schemas";
import { ADDRESS_EVENTS } from "#/pubsub";
import { CreateAddressSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { unsetPrimaryAddresses } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const CreateInputSchema = object({ input: CreateAddressSchema });

export const createAddress = Workflow.name("masters.address.create")
  .input(CreateInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateAddressSchema, input);

    if (parsed.isPrimary) {
      await ctx.step.run("unset-primary", () =>
        unsetPrimaryAddresses(ctx.db, parsed.entityType, parsed.entityId),
      );
    }

    const [address] = await ctx.db
      .insert(masterAddress)
      .values({
        city: parsed.city ?? null,
        country: parsed.country,
        entityId: parsed.entityId,
        entityType: parsed.entityType,
        isPrimary: parsed.isPrimary,
        label: parsed.label ?? null,
        line1: parsed.line1,
        line2: parsed.line2 ?? null,
        metadata: parsed.metadata ?? null,
        postalCode: parsed.postalCode ?? null,
        state: parsed.state ?? null,
      })
      .returning();

    if (!address) {
      throw new Error("Failed to create address.");
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: address.id,
        entityType: AUDIT_ENTITY_TYPE.ADDRESS,
        newState: {
          city: address.city,
          country: address.country,
          entityId: address.entityId,
          entityType: address.entityType,
          isPrimary: address.isPrimary,
          label: address.label,
          line1: address.line1,
        },
      });

      await ctx.pubsub.publish(ADDRESS_EVENTS.CREATED, {
        address: { country: address.country, id: address.id, label: address.label },
        entityId: address.entityId,
        entityType: address.entityType,
      });
    });

    return address;
  });
