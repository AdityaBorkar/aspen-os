import { BRANCH_TYPE } from "@aspen-os/constants";
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
    addressLine1: text("address_line1").notNull(),
    addressLine2: text("address_line2"),
    capacity: integer("capacity"),
    city: text("city").notNull(),
    closedDate: date("closed_date"),
    code: text("code").notNull().unique(),
    country: text("country").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    email: text("email"),
    id: text("id").primaryKey().default("gen_random_uuid()::text"),
    isActive: boolean("is_active").notNull().default(true),
    manager: text("manager"),
    metadata: jsonb("metadata"),
    name: text("name").notNull(),
    notes: text("notes"),
    openedDate: date("opened_date"),
    parentBranch: text("parent_branch"),
    phone: text("phone"),
    postalCode: text("postal_code"),
    state: text("state"),
    timezone: text("timezone"),
    type: branchTypeEnum("type").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_branch_type").on(table.type),
    index("idx_branch_is_active").on(table.isActive),
    index("idx_branch_country").on(table.country),
    index("idx_branch_parent").on(table.parentBranch),
  ],
);
