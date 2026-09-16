import type { JsonValue } from "@aspen-os/platform/server";
import { uuidv7 } from "@aspen-os/platform/server";
import { index, jsonb, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

// Subdomain-routing row for the healthcare bounded context: every clinical
// table scopes to one branch via branch_id (default "main"). Not the
// organization hierarchy (masters org_branch); see
// workflows/shared/branch-lifecycle.ts.
export const healthcareBranch = pgTable(
  "healthcare_branch",
  {
    branch_id: text().notNull().default("main"),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    id: uuidv7().primaryKey(),
    kind: text().notNull().default("branch"),
    name: text().notNull(),
    payload: jsonb().$type<Record<string, JsonValue>>().notNull().default({}),
    pricelist_ids: text().array().notNull().default([]),
    status: text().notNull().default("active"),
    subdomain: text().notNull(),
    updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_healthcare_branch_subdomain").on(table.subdomain),
    index("idx_healthcare_branch_branch_id").on(table.branch_id),
    index("idx_healthcare_branch_status").on(table.status),
  ],
);

export type HealthcareBranch = typeof healthcareBranch.$inferSelect;
export type NewHealthcareBranch = typeof healthcareBranch.$inferInsert;
