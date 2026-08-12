import { sql } from "drizzle-orm";
import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import {
  driveGranteeTypeEnum,
  driveItemTypeEnum,
  drivePermissionEnum,
} from "./enums";

export const driveShare = pgTable(
  "drive_share",
  {
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    granteeId: text("grantee_id").notNull(),
    granteeType: driveGranteeTypeEnum("grantee_type").notNull(),
    id: text("id").primaryKey().default(sql`uuidv7()`),
    itemId: text("item_id").notNull(),
    itemType: driveItemTypeEnum("item_type").notNull(),
    message: text("message"),
    permission: drivePermissionEnum("permission").notNull(),
    sharedBy: text("shared_by").notNull(),
  },
  (table) => [
    index("idx_drive_share_item").on(table.itemId, table.itemType),
    index("idx_drive_share_grantee").on(table.granteeId, table.granteeType),
  ],
);
