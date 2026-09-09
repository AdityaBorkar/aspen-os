import { ORG_BRANCH_TYPE } from "@aspen-os/constants";
import { uuidv7 } from "@aspen-os/platform/server";
import { date, index, integer, jsonb, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const orgBranchTypeEnum = pgEnum("org_branch_type", [
  ORG_BRANCH_TYPE.FACTORY,
  ORG_BRANCH_TYPE.HEADQUARTERS,
  ORG_BRANCH_TYPE.OFFICE,
  ORG_BRANCH_TYPE.OTHER,
  ORG_BRANCH_TYPE.REMOTE,
  ORG_BRANCH_TYPE.STORE,
  ORG_BRANCH_TYPE.WAREHOUSE,
]);

export const orgBranch = pgTable(
  "org_branch",
  {
    capacity: integer(),
    closed_date: date(),
    code: text().notNull().unique(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    id: uuidv7().primaryKey(),
    metadata: jsonb(),
    name: text().notNull(),
    opened_date: date(),
    parent_org_branch: text(),
    timezone: text(),
    type: orgBranchTypeEnum().notNull(),
    updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_org_branch_type").on(table.type),
    index("idx_org_branch_parent").on(table.parent_org_branch),
  ],
);

export type OrgBranch = typeof orgBranch.$inferSelect;
export type NewOrgBranch = typeof orgBranch.$inferInsert;
