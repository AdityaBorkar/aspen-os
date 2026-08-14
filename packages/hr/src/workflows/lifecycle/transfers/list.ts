import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object, optional, parse } from "valibot";

import { employeeTransfer } from "../../../db-schemas";
import { TransferFiltersSchema } from "../../../types";

const InputSchema = object({
  filters: optional(TransferFiltersSchema),
});

export const listTransfers = Workflow.name("hr.lifecycle.list-transfers")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { filters } = input;

    const parsed = filters ? parse(TransferFiltersSchema, filters) : {};
    const conditions = [];

    if (parsed.employeeId) {
      conditions.push(eq(employeeTransfer.employeeId, parsed.employeeId));
    }
    if (parsed.status) {
      conditions.push(eq(employeeTransfer.status, parsed.status));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    return ctx.db.select().from(employeeTransfer).where(whereClause);
  });
