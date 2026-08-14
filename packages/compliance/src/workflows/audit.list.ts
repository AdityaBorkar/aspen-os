import { Workflow } from "@aspen-os/platform/server";
import { parse } from "valibot";

import { type AuditTrailFilters, AuditTrailFiltersSchema } from "../types";
import { type AuditLogRow, normalize, toFilter } from "./utils";

const listAuditEntries = Workflow.name("audit.list").handler(
  async (input: { filters?: AuditTrailFilters }, ctx) => {
    const { filters } = input;
    const parsed = filters ? parse(AuditTrailFiltersSchema, filters) : {};

    const rows = (await ctx.audit.query(
      toFilter(parsed as AuditTrailFilters | undefined),
    )) as AuditLogRow[];

    return rows.map(normalize);
  },
);

export { listAuditEntries };
