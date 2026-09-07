import { dmsFile } from "#/db-schemas";
import { ApplyFileViewSchema } from "#/types";
import type { FileViewCondition } from "#/types";
import { buildConditionsWhere, buildSortOrder } from "#/workflow-steps/condition-service";
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

/**
 * Sniff explicit status conditions out of a view filter list. Kept isolated so
 * the apply handler stays declarative: trashed/triaged rows are excluded
 * unless the caller explicitly targets them.
 */
export interface StatusFilter {
  includeTrashed: boolean;
  includeTriage: boolean;
}

export function parseStatusFilter(filters: FileViewCondition[]): StatusFilter {
  const explicitStatus = filters.find((filter) => filter.field === "status");
  return {
    includeTrashed: explicitStatus?.value === "trashed",
    includeTriage: explicitStatus?.value === "triaged",
  };
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
      const { includeTrashed, includeTriage } = parseStatusFilter(filters);

      const base = buildConditionsWhere(filters, {});
      if (base) {
        conditions.push(base);
      }

      if (includeTrashed) {
        conditions.push(sql`${dmsFile.status} = 'trashed'`);
      } else if (includeTriage) {
        conditions.push(sql`${dmsFile.status} = 'triaged'`);
      } else {
        conditions.push(sql`${dmsFile.status} <> 'trashed'`, sql`${dmsFile.status} <> 'triaged'`);
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
