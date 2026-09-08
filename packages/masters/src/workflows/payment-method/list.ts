import { masterPaymentMethod } from "#/db-schemas";
import { ListPaymentMethodsSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { and, desc, eq } from "drizzle-orm";

export const listPaymentMethods = Workflow.name("masters.payment-method.list")
  .input(ListPaymentMethodsSchema)
  .handler(async (input, ctx) =>
    ctx.step.run("query", async () => {
      const parsed = input.filters ?? {};
      const conditions = [
        eq(masterPaymentMethod.entity_type, input.entityType),
        eq(masterPaymentMethod.entity_id, input.entityId),
      ];

      if (parsed.direction) {
        conditions.push(eq(masterPaymentMethod.direction, parsed.direction));
      }
      if (parsed.status) {
        conditions.push(eq(masterPaymentMethod.status, parsed.status));
      }
      if (parsed.type) {
        conditions.push(eq(masterPaymentMethod.type, parsed.type));
      }

      return ctx.db
        .select()
        .from(masterPaymentMethod)
        .where(and(...conditions))
        .orderBy(desc(masterPaymentMethod.created_at));
    }),
  );
