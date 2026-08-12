import { uuidv7 } from "@aspen-os/platform/server";
import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { driveItemTypeEnum } from "./enums";

export const driveAccessLog = pgTable(
  "drive_access_log",
  {
    accessedBy: text("accessed_by"),
    action: text("action").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    id: text("id").primaryKey().$defaultFn(uuidv7),
    ip: text("ip"),
    itemId: text("item_id").notNull(),
    itemType: driveItemTypeEnum("item_type").notNull(),
    publicLinkId: text("public_link_id"),
    userAgent: text("user_agent"),
  },
  (table) => [
    index("idx_drive_access_log_item").on(table.itemId, table.itemType),
    index("idx_drive_access_log_public_link").on(table.publicLinkId),
    index("idx_drive_access_log_created").on(table.createdAt),
  ],
);
