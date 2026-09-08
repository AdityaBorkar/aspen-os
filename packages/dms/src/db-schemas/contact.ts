import { uuidv7 } from "@aspen-os/platform/server";
import { boolean, index, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const dmsContact = pgTable(
  "dms_contact",
  {
    company_name: text().notNull(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    created_by: text().notNull(),
    deletion_reason: text(),
    designation: text().notNull(),
    email: text().notNull(),
    first_name: text().notNull(),
    id: uuidv7().primaryKey(),
    is_removed: boolean().notNull().default(false),
    last_name: text().notNull(),
    linked_user_id: text(),
    phone: text().notNull(),
    removed_at: timestamp({ withTimezone: true }),
    updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("idx_dms_contact_email").on(table.email)],
);

export type DmsContact = typeof dmsContact.$inferSelect;
export type NewDmsContact = typeof dmsContact.$inferInsert;
