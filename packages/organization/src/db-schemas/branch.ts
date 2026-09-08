import { BRANCH_TYPE } from "@aspen-os/constants";
import { uuidv7 } from "@aspen-os/platform/server";
import { date, index, integer, jsonb, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const branchTypeEnum = pgEnum("branch_type", [
  BRANCH_TYPE.FACTORY,
  BRANCH_TYPE.HEADQUARTERS,
  BRANCH_TYPE.OFFICE,
  BRANCH_TYPE.OTHER,
  BRANCH_TYPE.REMOTE,
  BRANCH_TYPE.STORE,
  BRANCH_TYPE.WAREHOUSE,
]);

export const branch = pgTable(
  "branch",
  {
    capacity: integer(),
    closed_date: date(),
    code: text().notNull().unique(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    id: uuidv7().primaryKey(),
    metadata: jsonb(),
    name: text().notNull(),
    opened_date: date(),
    parent_branch: text(),
    timezone: text(),
    type: branchTypeEnum().notNull(),
    updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_branch_type").on(table.type),
    index("idx_branch_parent").on(table.parent_branch),
  ],
);
