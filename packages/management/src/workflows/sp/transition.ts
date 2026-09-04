import { serviceProvider } from "#/db-schemas";
import { IdSchema } from "#/types";
import { AUDIT_ENTITY_TYPE } from "#/utils/constants";
import type { AuditAction, SpStatus } from "#/utils/constants";
import { fetchServiceProviderStep } from "#/workflow-steps/fetch-sp";

import { Workflow } from "@aspen-os/platform/server";
import type { PubSubUnit } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

interface SpTransitionConfig {
  auditAction: AuditAction;
  name: string;
  publish: (ctx: { pubsub: PubSubUnit }, id: string) => Promise<string | null>;
  to: SpStatus;
}

export function defineSpStatusTransition(config: SpTransitionConfig) {
  return Workflow.name(config.name)
    .input(object({ id: IdSchema }))
    .handler(async (input, ctx) => {
      const { id } = input;

      const previous = await ctx.step.run(fetchServiceProviderStep, { id });

      if (previous.status === config.to) {
        return previous;
      }

      const [updated] = await ctx.step.run("transition", () =>
        ctx.db
          .update(serviceProvider)
          .set({ status: config.to, updatedAt: new Date() })
          .where(eq(serviceProvider.id, id))
          .returning(),
      );

      if (!updated) {
        throw new Error(`Service Provider with id "${id}" not found.`);
      }

      await ctx.step.run("audit-and-notify", async () => {
        await ctx.audit.write({
          action: config.auditAction,
          crudAction: "update",
          entityId: id,
          entityType: AUDIT_ENTITY_TYPE.SERVICE_PROVIDER,
          newState: { status: config.to },
          previousState: previous,
        });

        await config.publish(ctx, id);
      });

      return updated;
    });
}
