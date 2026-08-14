import { uuidv7 } from "@aspen-os/platform/server";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { FIELD_TYPE } from "../utils/constants";

export const dmsFieldTypeEnum = pgEnum("dms_field_type", [
  FIELD_TYPE.TEXT,
  FIELD_TYPE.NUMBER,
  FIELD_TYPE.DATE,
  FIELD_TYPE.SELECT,
  FIELD_TYPE.MULTI_SELECT,
  FIELD_TYPE.BOOLEAN,
  FIELD_TYPE.USER,
  FIELD_TYPE.CONTACT,
  FIELD_TYPE.URL,
  FIELD_TYPE.EMAIL,
  FIELD_TYPE.PHONE,
]);

export const dmsClassField = pgTable(
  "dms_class_field",
  {
    classId: text("class_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    defaultValue: jsonb("default_value"),
    id: text("id").primaryKey().$defaultFn(uuidv7),
    includeInSearch: boolean("include_in_search").notNull().default(true),
    isActive: boolean("is_active").notNull().default(true),
    isRequired: boolean("is_required").notNull().default(false),
    label: text("label").notNull(),
    name: text("name").notNull(),
    options: jsonb("options"),
    sortOrder: integer("sort_order").notNull().default(0),
    type: dmsFieldTypeEnum("type").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_dms_class_field_class").on(table.classId),
    uniqueIndex("idx_dms_class_field_class_name").on(table.classId, table.name),
  ],
);

export type DmsClassField = typeof dmsClassField.$inferSelect;
export type NewDmsClassField = typeof dmsClassField.$inferInsert;
