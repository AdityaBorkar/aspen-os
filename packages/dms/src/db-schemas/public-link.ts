import { dmsEntityTypeEnum, dmsPublicLinkPermissionEnum } from "#/db-schemas/enums";

import { uuidv7 } from "@aspen-os/platform/server";
import { boolean, index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const dmsPublicLink = pgTable(
  "dms_public_link",
  {
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    createdBy: text("created_by").notNull(),
    entityId: text("entity_id").notNull(),
    entityType: dmsEntityTypeEnum("entity_type").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    id: text("id").primaryKey().$defaultFn(uuidv7),
    isActive: boolean("is_active").notNull().default(true),
    maxViews: integer("max_views"),
    password: text("password"),
    permission: dmsPublicLinkPermissionEnum("permission").notNull().default("view"),
    token: text("token").notNull().unique(),
    viewCount: integer("view_count").notNull().default(0),
  },
  (table) => [
    index("idx_dms_public_link_entity").on(table.entityId, table.entityType),
    index("idx_dms_public_link_active").on(table.isActive),
  ],
);

export type DmsPublicLink = typeof dmsPublicLink.$inferSelect;
export type NewDmsPublicLink = typeof dmsPublicLink.$inferInsert;
