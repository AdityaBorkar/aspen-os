import { dmsEntityTypeEnum } from "#/db-schemas/enums";

import { uuidv7 } from "@aspen-os/platform/server";
import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const dmsAccessLog = pgTable(
  "dms_access_log",
  {
    accessedBy: text("accessed_by"),
    action: text("action").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    entityId: text("entity_id").notNull(),
    entityType: dmsEntityTypeEnum("entity_type").notNull(),
    id: uuidv7("id").primaryKey(),
    ip: text("ip"),
    publicLinkId: text("public_link_id"),
    userAgent: text("user_agent"),
  },
  (table) => [
    index("idx_dms_access_log_entity").on(table.entityId, table.entityType),
    index("idx_dms_access_log_public_link").on(table.publicLinkId),
    index("idx_dms_access_log_created").on(table.createdAt),
  ],
);

export type DmsAccessLog = typeof dmsAccessLog.$inferSelect;
export type NewDmsAccessLog = typeof dmsAccessLog.$inferInsert;
