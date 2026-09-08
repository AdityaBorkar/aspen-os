import { FIELD_TYPE } from "#/utils/constants";

import type { JsonValue } from "@aspen-os/platform/server";
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
    class_id: text().notNull(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    default_value: jsonb().$type<JsonValue | null>(),
    id: uuidv7().primaryKey(),
    include_in_search: boolean().notNull().default(true),
    is_active: boolean().notNull().default(true),
    is_required: boolean().notNull().default(false),
    label: text().notNull(),
    name: text().notNull(),
    options: jsonb().$type<JsonValue | null>(),
    sort_order: integer().notNull().default(0),
    type: dmsFieldTypeEnum().notNull(),
    updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_dms_class_field_class").on(table.class_id),
    uniqueIndex("idx_dms_class_field_class_name").on(table.class_id, table.name),
  ],
);

export type DmsClassField = typeof dmsClassField.$inferSelect;
export type NewDmsClassField = typeof dmsClassField.$inferInsert;
