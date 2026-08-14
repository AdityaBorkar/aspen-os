import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";

import { complianceObligation } from "../../db-schemas";

const getActiveObligations = Workflow.name("obligation.active").handler(
  async (_input: Record<string, never>, ctx) =>
    ctx.db
      .select()
      .from(complianceObligation)
      .where(
        and(eq(complianceObligation.isActive, true), eq(complianceObligation.autoGenerate, true)),
      ),
);

export { getActiveObligations };
