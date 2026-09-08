import { complianceObligation } from "#/db-schemas";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";

const getActiveObligations = Workflow.name("obligation.active").handler(
  async (_input: Record<string, never>, ctx) =>
    ctx.db
      .select()
      .from(complianceObligation)
      .where(
        and(eq(complianceObligation.is_active, true), eq(complianceObligation.auto_generate, true)),
      ),
);

export { getActiveObligations };
