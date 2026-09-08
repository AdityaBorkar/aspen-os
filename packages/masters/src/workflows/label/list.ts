import { masterLabel } from "#/db-schemas";
import { ListLabelsSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq, ilike, isNotNull, isNull, or } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

export const listLabels = Workflow.name("masters.label.list")
  .input(ListLabelsSchema)
  .handler(async (input, ctx) =>
    ctx.step.run("query", async () => {
      const filters = input.filters ?? {};
      const scopeType = input.scopeType ?? filters.scopeType ?? null;
      const scopeId = input.scopeId ?? filters.scopeId ?? null;
      const { search } = filters;
      const includeGlobal = input.includeGlobal ?? true;
      const limit = input.limit ?? 50;
      const offset = input.offset ?? 0;

      const conditions: SQL[] = [];

      if (scopeType != null && scopeId != null) {
        if (includeGlobal) {
          conditions.push(
            or(
              and(isNull(masterLabel.scope_type), isNull(masterLabel.scope_id)),
              and(eq(masterLabel.scope_type, scopeType), eq(masterLabel.scope_id, scopeId)),
            )!,
          );
        } else {
          conditions.push(
            and(eq(masterLabel.scope_type, scopeType), eq(masterLabel.scope_id, scopeId))!,
          );
        }
      } else if (scopeType != null || scopeId != null) {
        // Partial scope should not happen due to validation, but handle gracefully.
        if (scopeType) {
          conditions.push(eq(masterLabel.scope_type, scopeType));
        }
        if (scopeId) {
          conditions.push(eq(masterLabel.scope_id, scopeId));
        }
      } else if (!includeGlobal) {
        conditions.push(isNotNull(masterLabel.scope_type));
      }

      if (search) {
        const term = `%${search}%`;
        conditions.push(ilike(masterLabel.name, term));
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      return ctx.db
        .select()
        .from(masterLabel)
        .where(where)
        .orderBy(masterLabel.name)
        .limit(limit)
        .offset(offset);
    }),
  );
