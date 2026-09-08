import { BRANCH_TYPE } from "@aspen-os/constants";
import { uuidv7 } from "@aspen-os/platform/server";
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

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
    address_line1: text().notNull(),
    address_line2: text(),
    capacity: integer(),
    city: text().notNull(),
    closed_date: date(),
    code: text().notNull().unique(),
    country: text().notNull(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    email: text(),
    id: uuidv7().primaryKey(),
    is_active: boolean().notNull().default(true),
    manager: text(),
    metadata: jsonb(),
    name: text().notNull(),
    notes: text(),
    opened_date: date(),
    parent_branch: text(),
    phone: text(),
    postal_code: text(),
    state: text(),
    timezone: text(),
    type: branchTypeEnum().notNull(),
    updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_branch_type").on(table.type),
    index("idx_branch_is_active").on(table.is_active),
    index("idx_branch_country").on(table.country),
    index("idx_branch_parent").on(table.parent_branch),
  ],
);
