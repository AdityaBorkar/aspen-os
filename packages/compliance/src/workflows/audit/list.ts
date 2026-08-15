import { AuditTrailFiltersSchema } from "#/types";
import type { AuditTrailFilters } from "#/types";
import { normalize, toFilter } from "#/workflows/utils";
import type { AuditLogRow } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { parse } from "valibot";

const listAuditEntries = Workflow.name("audit.list").handler(
  async (input: { filters?: AuditTrailFilters }, ctx) => {
    const { filters } = input;
    const parsed = filters ? parse(AuditTrailFiltersSchema, filters) : {};

    const rows = (await ctx.audit.query(toFilter(parsed))) as AuditLogRow[];

    return rows.map(normalize);
  },
);

export { listAuditEntries };
