import { uuidv7 } from "@aspen-os/platform/server";
import { boolean, index, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const dmsContact = pgTable(
  "dms_contact",
  {
    companyName: text("company_name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    createdBy: text("created_by").notNull(),
    deletionReason: text("deletion_reason"),
    designation: text("designation").notNull(),
    email: text("email").notNull(),
    firstName: text("first_name").notNull(),
    id: uuidv7("id").primaryKey(),
    isRemoved: boolean("is_removed").notNull().default(false),
    lastName: text("last_name").notNull(),
    linkedUserId: text("linked_user_id"),
    phone: text("phone").notNull(),
    removedAt: timestamp("removed_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("idx_dms_contact_email").on(table.email)],
);

export type DmsContact = typeof dmsContact.$inferSelect;
export type NewDmsContact = typeof dmsContact.$inferInsert;
