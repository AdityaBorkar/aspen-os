import { TaskPrioritySchema } from "#/schemas/enums";
import { IdSchema, IntSchema, TitleSchema } from "#/schemas/utils";

import {
  array,
  boolean,
  date,
  minLength,
  nullable,
  number,
  object,
  omit,
  optional,
  partial,
  pipe,
  string,
} from "valibot";
import type { InferOutput } from "valibot";

export const CreateTaskSchema = object({
  description: optional(nullable(string())),
  dueDate: optional(date()),
  estimatedHours: optional(nullable(number())),
  labels: optional(array(string())),
  // Preassigned display number (`KEY-SEQ`) and sequence. When both are
  // present the project-counter increment is skipped — split deployments
  // reserve the number against the control plane first (see
  // `project.reserve-task-number`), because the tenant database cannot see
  // `task_project`. Omitted in single-DB deployments (generated inline).
  number: optional(nullable(string())),
  parentId: optional(nullable(IdSchema)),
  priority: optional(TaskPrioritySchema),
  projectId: IdSchema,
  reporterId: IdSchema,
  startDate: optional(date()),
  statusId: IdSchema,
  taskNumber: optional(nullable(IntSchema)),
  title: TitleSchema,
  typeId: optional(nullable(IdSchema)),
});

export type CreateTaskInput = InferOutput<typeof CreateTaskSchema>;

export const UpdateTaskSchema = partial(omit(CreateTaskSchema, ["projectId", "reporterId"]));

export type UpdateTaskInput = InferOutput<typeof UpdateTaskSchema>;

export const TaskFiltersSchema = object({
  assigneeId: optional(IdSchema),
  isArchived: optional(boolean()),
  label: optional(string()),
  parentId: optional(nullable(IdSchema)),
  priority: optional(TaskPrioritySchema),
  projectId: optional(IdSchema),
  reporterId: optional(IdSchema),
  search: optional(string()),
  statusId: optional(IdSchema),
  typeId: optional(IdSchema),
});

export type TaskFilters = InferOutput<typeof TaskFiltersSchema>;

export const BulkUpdateTaskSchema = object({
  ids: pipe(array(IdSchema), minLength(1, "At least one id is required")),
  patch: UpdateTaskSchema,
});

export type BulkUpdateTaskInput = InferOutput<typeof BulkUpdateTaskSchema>;

export const AssignTaskSchema = object({
  assignedBy: IdSchema,
  isLead: optional(boolean()),
  taskId: IdSchema,
  userId: IdSchema,
});

export type AssignTaskInput = InferOutput<typeof AssignTaskSchema>;
