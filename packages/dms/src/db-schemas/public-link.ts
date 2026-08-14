import { uuidv7 } from "@aspen-os/platform/server";
import { boolean, index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { dmsItemTypeEnum, dmsPublicLinkPermissionEnum } from "./enums";

export const dmsPublicLink = pgTable(
  "dms_public_link",
  {
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    createdBy: text("created_by").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    id: text("id").primaryKey().$defaultFn(uuidv7),
    isActive: boolean("is_active").notNull().default(true),
    itemId: text("item_id").notNull(),
    itemType: dmsItemTypeEnum("item_type").notNull(),
    maxViews: integer("max_views"),
    password: text("password"),
    permission: dmsPublicLinkPermissionEnum("permission").notNull().default("view"),
    token: text("token").notNull().unique(),
    viewCount: integer("view_count").notNull().default(0),
  },
  (table) => [
    index("idx_dms_public_link_item").on(table.itemId, table.itemType),
    index("idx_dms_public_link_active").on(table.isActive),
  ],
);

export type DmsPublicLink = typeof dmsPublicLink.$inferSelect;
export type NewDmsPublicLink = typeof dmsPublicLink.$inferInsert;
