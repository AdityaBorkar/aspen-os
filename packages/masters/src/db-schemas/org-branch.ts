import { ORG_BRANCH_TYPE } from "@aspen-os/constants";
import { uuidv7 } from "@aspen-os/platform/server";
import { index, jsonb, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";

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
    billing_address_id: text(),
    billing_contact_id: text(),
    code: text().notNull().unique(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    gstin: text(),
    id: uuidv7().primaryKey(),
    location_address_id: text(),
    location_contact_id: text(),
    metadata: jsonb(),
    name: text().notNull(),
    parent_org_branch: text(),
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
