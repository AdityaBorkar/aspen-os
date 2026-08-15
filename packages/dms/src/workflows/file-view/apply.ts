import { dmsFile } from "#/db-schemas";
import { buildConditionsWhere, buildSortOrder } from "#/services/condition-service";
import { ApplyFileViewSchema } from "#/types";
import { fetchFileViewStep } from "#/workflow-steps/fetch-file-view";

import { Workflow } from "@aspen-os/platform/server";
import { and, desc, sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

const ApplyInputSchema = ApplyFileViewSchema;

function resolveFileSortField(field: string): SQL | null {
  switch (field) {
    case "createdAt": {
      return sql`${dmsFile.createdAt}`;
    }
    case "name": {
      return sql`${dmsFile.name}`;
    }
    case "size": {
      return sql`${dmsFile.size}`;
    }
    case "updatedAt": {
      return sql`${dmsFile.updatedAt}`;
    }
    case "expiryDate": {
      return sql`${dmsFile.expiryDate}`;
    }
    default: {
      return null;
    }
  }
}

export const applyFileView = Workflow.name("dms.file-view.apply")
  .input(ApplyInputSchema)
  .handler(async (input, ctx) => {
    let filters = input.filters ?? [];
    let sort = input.sort ?? [];

    if (input.viewId) {
      const view = await ctx.step.run(fetchFileViewStep, { id: input.viewId });
      ({ filters, sort } = view);
    }

    return ctx.step.run("query", async () => {
      const conditions: SQL[] = [];

      const explicitStatus = filters.find((filter) => filter.field === "status");
      const targetsTriage = explicitStatus?.value === "triaged";
      const targetsTrashed = explicitStatus?.value === "trashed";

      const base = buildConditionsWhere(filters, {});
      if (base) {
        conditions.push(base);
      }

      conditions.push(sql`${dmsFile.status} <> 'trashed'`, sql`${dmsFile.status} <> 'triaged'`);
      if (targetsTrashed) {
        conditions.pop();
        conditions.push(sql`${dmsFile.status} = 'trashed'`);
      }
      if (targetsTriage) {
        conditions.pop();
        conditions.push(sql`${dmsFile.status} = 'triaged'`);
      }

      const orderBy = buildSortOrder(sort, resolveFileSortField);
      if (orderBy.length === 0) {
        orderBy.push(desc(dmsFile.createdAt));
      }

      return ctx.db
        .select()
        .from(dmsFile)
        .where(and(...conditions))
        .orderBy(...orderBy)
        .limit(input.limit ?? 50)
        .offset(input.offset ?? 0);
    });
  });
