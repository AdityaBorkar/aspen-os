import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

import { tenant } from "../db-schemas";
import { IdSchema } from "../types";

export const getAssignedTenants = Workflow.name("sp.assigned-tenants")
  .input(object({ spId: IdSchema }))
  .handler(async (input, ctx) => {
    const { spId } = input;

    return ctx.step.run("query", async () =>
      ctx.db.select().from(tenant).where(eq(tenant.serviceProviderId, spId)),
    );
  });
