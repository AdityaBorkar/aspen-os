import { Workflow } from "@aspen-os/platform/server";
import { and, desc, type SQL, sql } from "drizzle-orm";

import { dmsFile } from "../../db-schemas";
import { buildConditionsWhere, buildSortOrder } from "../../services/condition-service";
import { ApplyFileViewSchema, type FileViewCondition, type FileViewSort } from "../../types";
import { fetchFileViewStep } from "../../workflow-steps/fetch-file-view";

const ApplyInputSchema = ApplyFileViewSchema;

function resolveFileSortField(field: string): SQL | null {
  switch (field) {
    case "createdAt":
      return dmsFile.createdAt as unknown as SQL;
    case "name":
      return dmsFile.name as unknown as SQL;
    case "size":
      return dmsFile.size as unknown as SQL;
    case "updatedAt":
      return dmsFile.updatedAt as unknown as SQL;
    case "expiryDate":
      return dmsFile.expiryDate as unknown as SQL;
    default:
      return null;
  }
}

export const applyFileView = Workflow.name("dms.file-view.apply")
  .input(ApplyInputSchema)
  .handler(async (input, ctx) => {
    let filters = input.filters ?? [];
    let sort = input.sort ?? [];

    if (input.viewId) {
      const view = await ctx.step.run(fetchFileViewStep, { id: input.viewId });
      filters = (view.filters as unknown as FileViewCondition[]) ?? [];
      sort = (view.sort as unknown as FileViewSort[]) ?? [];
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
        orderBy.push(desc(dmsFile.createdAt) as unknown as SQL);
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
