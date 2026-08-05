import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

import { serviceProvider } from "../db-schemas";
import { SERVICE_PROVIDER_EVENTS } from "../pubsub";
import { IdSchema, UpdateServiceProviderSchema } from "../types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "../utils/constants";
import { stripUndefined } from "../utils/strip-undefined";
import { fetchServiceProviderStep } from "./steps/fetch-sp";

export const updateSp = Workflow.name("sp.update")
  .input(
    object({
      id: IdSchema,
      patch: UpdateServiceProviderSchema,
    }),
  )
  .handler(async (input, ctx) => {
    const { id, patch } = input;
    await ctx.step.run(fetchServiceProviderStep, { id });

    const data = stripUndefined(patch);
    if (Object.keys(data).length === 0)
      return ctx.step.run(fetchServiceProviderStep, { id });

    await ctx.step.run("update-record", async () => {
      await ctx.db
        .update(serviceProvider)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(serviceProvider.id, id));
    });

    await ctx.audit.write({
      action: AUDIT_ACTION.SP_UPDATED,
      changes: data,
      crudAction: "update",
      entityId: id,
      entityType: AUDIT_ENTITY_TYPE.SERVICE_PROVIDER,
    });

    await ctx.pubsub.publish(SERVICE_PROVIDER_EVENTS.UPDATED, {
      changes: data,
      serviceProvider: { id, name: data.name ?? "" },
    });

    return ctx.step.run(fetchServiceProviderStep, { id });
  });
