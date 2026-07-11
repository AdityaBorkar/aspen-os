import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const taskPriorityEnum = pgEnum("task_priority", [
  "urgent",
  "high",
  "medium",
  "low",
  "none",
]);

export const taskLinkTypeEnum = pgEnum("task_link_type", [
  "blocks",
  "blocked_by",
  "related_to",
  "duplicates",
  "caused_by",
  "split_from",
]);

export const projectStatusEnum = pgEnum("project_status", [
  "active",
  "archived",
  "paused",
]);

export const projectMemberRoleEnum = pgEnum("project_member_role", [
  "admin",
  "member",
  "viewer",
]);

export const statusCategoryEnum = pgEnum("status_category", [
  "backlog",
  "unstarted",
  "started",
  "completed",
  "cancelled",
]);

export const savedViewTypeEnum = pgEnum("saved_view_type", [
  "list",
  "board",
  "calendar",
  "timeline",
]);

export const reminderTypeEnum = pgEnum("reminder_type", [
  "due_date",
  "custom",
  "overdue",
]);

export const automationTriggerEnum = pgEnum("automation_trigger", [
  "status_change",
  "assignment_change",
  "due_date_passed",
  "task_created",
  "task_updated",
]);

export const project = pgTable(
  "task_project",
  {
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    defaultTaskTypeId: text("default_task_type_id"),
    description: text("description"),
    id: text("id").primaryKey().default("gen_random_uuid()::text"),
    key: text("key").notNull().unique(),
    leadId: text("lead_id").notNull(),
    name: text("name").notNull(),
    startDate: timestamp("start_date", { withTimezone: true }),
    status: projectStatusEnum("status").notNull().default("active"),
    targetDate: timestamp("target_date", { withTimezone: true }),
    taskCounter: integer("task_counter").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_task_project_lead").on(table.leadId),
    index("idx_task_project_status").on(table.status),
  ],
);

export const projectMember = pgTable(
  "task_project_member",
  {
    joinedAt: timestamp("joined_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    projectId: text("project_id").notNull(),
    role: projectMemberRoleEnum("role").notNull().default("member"),
    userId: text("user_id").notNull(),
  },
  (table) => [
    uniqueIndex("uq_task_project_member_project_user").on(
      table.projectId,
      table.userId,
    ),
    index("idx_task_project_member_project").on(table.projectId),
    index("idx_task_project_member_user").on(table.userId),
  ],
);

export const taskType = pgTable(
  "task_type",
  {
    color: text("color"),
    icon: text("icon"),
    id: text("id").primaryKey().default("gen_random_uuid()::text"),
    isDefault: boolean("is_default").notNull().default(false),
    name: text("name").notNull(),
    projectId: text("project_id"),
  },
  (table) => [index("idx_task_type_project").on(table.projectId)],
);

export const status = pgTable(
  "task_status",
  {
    category: statusCategoryEnum("category").notNull(),
    color: text("color"),
    id: text("id").primaryKey().default("gen_random_uuid()::text"),
    isDefault: boolean("is_default").notNull().default(false),
    isResolved: boolean("is_resolved").notNull().default(false),
    name: text("name").notNull(),
    projectId: text("project_id"),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [
    index("idx_task_status_project").on(table.projectId),
    index("idx_task_status_sort").on(table.sortOrder),
  ],
);

export const statusTransition = pgTable(
  "task_status_transition",
  {
    fromStatusId: text("from_status_id").notNull(),
    id: text("id").primaryKey().default("gen_random_uuid()::text"),
    projectId: text("project_id").notNull(),
    requiresComment: boolean("requires_comment").notNull().default(false),
    requiresRole: text("requires_role"),
    toStatusId: text("to_status_id").notNull(),
  },
  (table) => [
    uniqueIndex("uq_task_status_transition").on(
      table.fromStatusId,
      table.toStatusId,
      table.projectId,
    ),
    index("idx_task_status_transition_project").on(table.projectId),
  ],
);

export const label = pgTable(
  "task_label_def",
  {
    color: text("color"),
    id: text("id").primaryKey().default("gen_random_uuid()::text"),
    name: text("name").notNull(),
    projectId: text("project_id"),
  },
  (table) => [index("idx_task_label_def_project").on(table.projectId)],
);

export const task = pgTable(
  "task",
  {
    assignedAt: timestamp("assigned_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    description: text("description"),
    dueDate: timestamp("due_date", { withTimezone: true }),
    estimatedHours: numeric("estimated_hours"),
    id: text("id").primaryKey().default("gen_random_uuid()::text"),
    isArchived: boolean("is_archived").notNull().default(false),
    labels: text("labels").array().default([]),
    number: text("number"),
    parentId: text("parent_id"),
    priority: taskPriorityEnum("priority").notNull().default("none"),
    projectId: text("project_id").notNull(),
    reporterId: text("reporter_id").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    startDate: timestamp("start_date", { withTimezone: true }),
    statusId: text("status_id").notNull(),
    taskNumber: integer("task_number"),
    title: text("title").notNull(),
    typeId: text("type_id"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_task_project").on(table.projectId),
    index("idx_task_status").on(table.statusId),
    index("idx_task_type").on(table.typeId),
    index("idx_task_parent").on(table.parentId),
    index("idx_task_reporter").on(table.reporterId),
    index("idx_task_priority").on(table.priority),
    index("idx_task_archived").on(table.isArchived),
    index("idx_task_due_date").on(table.dueDate),
  ],
);

export const taskAssignee = pgTable(
  "task_assignee",
  {
    assignedAt: timestamp("assigned_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    assignedBy: text("assigned_by").notNull(),
    id: text("id").primaryKey().default("gen_random_uuid()::text"),
    isLead: boolean("is_lead").notNull().default(false),
    taskId: text("task_id").notNull(),
    userId: text("user_id").notNull(),
  },
  (table) => [
    uniqueIndex("uq_task_assignee_task_user").on(table.taskId, table.userId),
    index("idx_task_assignee_task").on(table.taskId),
    index("idx_task_assignee_user").on(table.userId),
  ],
);

export const taskLink = pgTable(
  "task_link",
  {
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    id: text("id").primaryKey().default("gen_random_uuid()::text"),
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

export const timeEntry = pgTable(
  "task_time_entry",
  {
    billable: boolean("billable").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    date: date("date").notNull(),
    description: text("description"),
    duration: integer("duration").notNull(),
    id: text("id").primaryKey().default("gen_random_uuid()::text"),
    taskId: text("task_id").notNull(),
    userId: text("user_id").notNull(),
  },
  (table) => [
    index("idx_task_time_entry_task").on(table.taskId),
    index("idx_task_time_entry_user").on(table.userId),
    index("idx_task_time_entry_date").on(table.date),
  ],
);

export const reminder = pgTable(
  "task_reminder",
  {
    id: text("id").primaryKey().default("gen_random_uuid()::text"),
    interval: text("interval"),
    isRecurring: boolean("is_recurring").notNull().default(false),
    isSent: boolean("is_sent").notNull().default(false),
    message: text("message"),
    remindAt: timestamp("remind_at", { withTimezone: true }).notNull(),
    taskId: text("task_id").notNull(),
    type: reminderTypeEnum("type").notNull(),
    userId: text("user_id").notNull(),
  },
  (table) => [
    index("idx_task_reminder_task").on(table.taskId),
    index("idx_task_reminder_user").on(table.userId),
    index("idx_task_reminder_sent").on(table.isSent),
    index("idx_task_reminder_at").on(table.remindAt),
  ],
);

export const activityLog = pgTable(
  "task_activity_log",
  {
    action: text("action").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    id: text("id").primaryKey().default("gen_random_uuid()::text"),
    newValue: jsonb("new_value"),
    oldValue: jsonb("old_value"),
    taskId: text("task_id").notNull(),
    userId: text("user_id").notNull(),
  },
  (table) => [
    index("idx_task_activity_log_task").on(table.taskId),
    index("idx_task_activity_log_action").on(table.action),
    index("idx_task_activity_log_created").on(table.createdAt),
  ],
);

export const comment = pgTable(
  "task_comment",
  {
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    editedAt: timestamp("edited_at", { withTimezone: true }),
    id: text("id").primaryKey().default("gen_random_uuid()::text"),
    isDeleted: boolean("is_deleted").notNull().default(false),
    parentId: text("parent_id"),
    taskId: text("task_id").notNull(),
    userId: text("user_id").notNull(),
  },
  (table) => [
    index("idx_task_comment_task").on(table.taskId),
    index("idx_task_comment_parent").on(table.parentId),
    index("idx_task_comment_user").on(table.userId),
  ],
);

export const attachment = pgTable(
  "task_attachment",
  {
    commentId: text("comment_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    fileId: text("file_id").notNull(),
    id: text("id").primaryKey().default("gen_random_uuid()::text"),
    taskId: text("task_id").notNull(),
    uploadedBy: text("uploaded_by").notNull(),
  },
  (table) => [
    index("idx_task_attachment_task").on(table.taskId),
    index("idx_task_attachment_comment").on(table.commentId),
  ],
);

export const watcher = pgTable(
  "task_watcher",
  {
    addedAt: timestamp("added_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    id: text("id").primaryKey().default("gen_random_uuid()::text"),
    taskId: text("task_id").notNull(),
    userId: text("user_id").notNull(),
  },
  (table) => [
    uniqueIndex("uq_task_watcher_task_user").on(table.taskId, table.userId),
    index("idx_task_watcher_task").on(table.taskId),
    index("idx_task_watcher_user").on(table.userId),
  ],
);

export const savedView = pgTable(
  "task_saved_view",
  {
    filters: jsonb("filters"),
    groupBy: text("group_by"),
    id: text("id").primaryKey().default("gen_random_uuid()::text"),
    isDefault: boolean("is_default").notNull().default(false),
    isShared: boolean("is_shared").notNull().default(false),
    name: text("name").notNull(),
    ownerId: text("owner_id").notNull(),
    projectId: text("project_id"),
    sort: jsonb("sort"),
    type: savedViewTypeEnum("type").notNull().default("list"),
  },
  (table) => [
    index("idx_task_saved_view_owner").on(table.ownerId),
    index("idx_task_saved_view_project").on(table.projectId),
  ],
);

export const automationRule = pgTable(
  "task_automation_rule",
  {
    actions: jsonb("actions").notNull(),
    conditions: jsonb("conditions"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    id: text("id").primaryKey().default("gen_random_uuid()::text"),
    isActive: boolean("is_active").notNull().default(true),
    name: text("name").notNull(),
    projectId: text("project_id").notNull(),
    trigger: automationTriggerEnum("trigger").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_task_automation_rule_project").on(table.projectId),
    index("idx_task_automation_rule_trigger").on(table.trigger),
    index("idx_task_automation_rule_active").on(table.isActive),
  ],
);
