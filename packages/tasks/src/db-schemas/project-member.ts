import { index, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

import { projectMemberRoleEnum } from "./enums";

export const projectMember = pgTable(
  "task_project_member",
  {
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
    projectId: text("project_id").notNull(),
    role: projectMemberRoleEnum("role").notNull().default("member"),
    userId: text("user_id").notNull(),
  },
  (table) => [
    uniqueIndex("uq_task_project_member_project_user").on(table.projectId, table.userId),
    index("idx_task_project_member_project").on(table.projectId),
    index("idx_task_project_member_user").on(table.userId),
  ],
);

export type ProjectMember = typeof projectMember.$inferSelect;
export type NewProjectMember = typeof projectMember.$inferInsert;
