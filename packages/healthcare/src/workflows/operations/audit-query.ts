import { QueryAuditSchema } from "#/schemas/operations";
import { serializeExplorerRow } from "#/workflow-steps/explorer-tables";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const AuditQueryInputSchema = object({ input: QueryAuditSchema });

export const auditQuery = Workflow.name("healthcare.operations.audit-query")
  .input(AuditQueryInputSchema)
  .handler(async ({ input }, ctx) => {
    // Thin view over the platform audit unit; compliance owns the
    // obligation/verification/document/audit/dashboard surfaces. Healthcare
    // emits evidence and never owns the evidence store.
    const parsed = parse(QueryAuditSchema, input);
    const entries = await ctx.step.run("query-audit", async () =>
      ctx.audit.query({ limit: parsed.limit ?? 200 }),
    );
    return entries.map((entry) => serializeExplorerRow(entry));
  });
