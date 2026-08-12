import { uuidv7 } from "@aspen-os/platform/server";
import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { taskLinkTypeEnum } from "./enums";

export const taskLink = pgTable(
  "task_link",
  {
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    id: text("id").primaryKey().$defaultFn(uuidv7),
    linkType: taskLinkTypeEnum("link_type").notNull(),
    sourceId: text("source_id").notNull(),
    targetId: text("target_id").notNull(),
  },
  (table) => [
    uniqueIndex("uq_task_link_source_target_type").on(
      table.sourceId,
      table.targetId,
      table.linkType,
    ),
    index("idx_task_link_source").on(table.sourceId),
    index("idx_task_link_target").on(table.targetId),
  ],
);

export type TaskLink = typeof taskLink.$inferSelect;
export type NewTaskLink = typeof taskLink.$inferInsert;
