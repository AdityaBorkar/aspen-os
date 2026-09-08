import { dmsEntityTypeEnum, dmsPublicLinkPermissionEnum } from "#/db-schemas/enums";

import { uuidv7 } from "@aspen-os/platform/server";
import { boolean, index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const dmsPublicLink = pgTable(
  "dms_public_link",
  {
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    created_by: text().notNull(),
    entity_id: text().notNull(),
    entity_type: dmsEntityTypeEnum().notNull(),
    expires_at: timestamp({ withTimezone: true }),
    id: uuidv7().primaryKey(),
    is_active: boolean().notNull().default(true),
    max_views: integer(),
    password: text(),
    permission: dmsPublicLinkPermissionEnum().notNull().default("view"),
    token: text().notNull().unique(),
    view_count: integer().notNull().default(0),
  },
  (table) => [
    index("idx_dms_public_link_entity").on(table.entity_id, table.entity_type),
    index("idx_dms_public_link_active").on(table.is_active),
  ],
);

export type DmsPublicLink = typeof dmsPublicLink.$inferSelect;
export type NewDmsPublicLink = typeof dmsPublicLink.$inferInsert;
