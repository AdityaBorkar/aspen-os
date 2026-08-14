import { Workflow } from "@aspen-os/platform/server";
import { and, desc, type SQL, sql } from "drizzle-orm";

import { dmsDocument } from "../db-schemas";
import { buildConditionsWhere, buildSortOrder } from "../services/condition-service";
import { type ViewCondition, ApplyViewSchema, type ViewSort } from "../types";
import { fetchViewStep } from "../workflow-steps/fetch-view";

const ApplyInputSchema = ApplyViewSchema;

function resolveDocumentSortField(field: string): SQL | null {
  switch (field) {
    case "createdAt":
      return dmsDocument.createdAt as unknown as SQL;
    case "name":
      return dmsDocument.name as unknown as SQL;
    case "size":
      return dmsDocument.size as unknown as SQL;
    case "updatedAt":
      return dmsDocument.updatedAt as unknown as SQL;
    case "expiryDate":
      return dmsDocument.expiryDate as unknown as SQL;
    default:
      return null;
  }
}

export const applyView = Workflow.name("dms.view.apply")
  .input(ApplyInputSchema)
  .handler(async (input, ctx) => {
    let filters = input.filters ?? [];
    let sort = input.sort ?? [];

    if (input.viewId) {
      const view = await ctx.step.run(fetchViewStep, { id: input.viewId });
      filters = (view.filters as unknown as ViewCondition[]) ?? [];
      sort = (view.sort as unknown as ViewSort[]) ?? [];
    }

    return ctx.step.run("query", async () => {
      const conditions: SQL[] = [];

      const explicitStatus = filters.find((filter) => filter.field === "status");
      const targetsTriage = explicitStatus?.value === "triaged";
      const targetsDeleted = explicitStatus?.value === "deleted";

      const base = buildConditionsWhere(filters, {});
      if (base) {
        conditions.push(base);
      }

      conditions.push(
        sql`${dmsDocument.status} <> 'deleted'`,
        sql`${dmsDocument.status} <> 'triaged'`,
      );
      if (targetsDeleted) {
        conditions.pop();
        conditions.push(sql`${dmsDocument.status} = 'deleted'`);
      }
      if (targetsTriage) {
        conditions.pop();
        conditions.push(sql`${dmsDocument.status} = 'triaged'`);
      }

      const orderBy = buildSortOrder(sort, resolveDocumentSortField);
      if (orderBy.length === 0) {
        orderBy.push(desc(dmsDocument.createdAt) as unknown as SQL);
      }

      return ctx.db
        .select()
        .from(dmsDocument)
        .where(and(...conditions))
        .orderBy(...orderBy)
        .limit(input.limit ?? 50)
        .offset(input.offset ?? 0);
    });
  });
