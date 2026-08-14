import { uuidv7 } from "@aspen-os/platform/server";
import { boolean, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const dmsClass = pgTable("dms_class", {
  color: text("color"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  createdBy: text("created_by").notNull(),
  description: text("description"),
  fileNamingSchema: text("file_naming_schema"),
  icon: text("icon"),
  id: text("id").primaryKey().$defaultFn(uuidv7),
  isActive: boolean("is_active").notNull().default(true),
  name: text("name").notNull(),
  retentionDays: integer("retention_days"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type DmsClass = typeof dmsClass.$inferSelect;
export type NewDmsClass = typeof dmsClass.$inferInsert;
