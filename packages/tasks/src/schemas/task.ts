import {
  array,
  boolean,
  date,
  type InferOutput,
  minLength,
  nullable,
  number,
  object,
  optional,
  pipe,
  string,
} from "valibot";

import { TaskPrioritySchema } from "./enums";
import { TitleSchema } from "./utils";

export const CreateTaskSchema = object({
  description: optional(nullable(string())),
  dueDate: optional(date()),
  estimatedHours: optional(nullable(number())),
  labels: optional(array(string())),
  parentId: optional(nullable(string())),
  priority: optional(TaskPrioritySchema),
  projectId: pipe(string(), minLength(1, "projectId is required")),
  reporterId: pipe(string(), minLength(1, "reporterId is required")),
  startDate: optional(date()),
  statusId: pipe(string(), minLength(1, "statusId is required")),
  title: TitleSchema,
  typeId: optional(nullable(string())),
});

export type CreateTaskInput = InferOutput<typeof CreateTaskSchema>;

export const UpdateTaskSchema = object({
  description: optional(nullable(string())),
  dueDate: optional(date()),
  estimatedHours: optional(nullable(number())),
  labels: optional(array(string())),
  parentId: optional(nullable(string())),
  priority: optional(TaskPrioritySchema),
  startDate: optional(date()),
  statusId: optional(string()),
  title: optional(TitleSchema),
  typeId: optional(nullable(string())),
});

export type UpdateTaskInput = InferOutput<typeof UpdateTaskSchema>;

export const TaskFiltersSchema = object({
  assigneeId: optional(string()),
  isArchived: optional(boolean()),
  label: optional(string()),
  parentId: optional(nullable(string())),
  priority: optional(TaskPrioritySchema),
  projectId: optional(string()),
  reporterId: optional(string()),
  search: optional(string()),
  statusId: optional(string()),
  typeId: optional(string()),
});

export type TaskFilters = InferOutput<typeof TaskFiltersSchema>;

export const BulkUpdateTaskSchema = object({
  ids: pipe(array(string()), minLength(1, "At least one id is required")),
  patch: UpdateTaskSchema,
});

export type BulkUpdateTaskInput = InferOutput<typeof BulkUpdateTaskSchema>;

export const AssignTaskSchema = object({
  assignedBy: pipe(string(), minLength(1, "assignedBy is required")),
  isLead: optional(boolean()),
  taskId: pipe(string(), minLength(1, "taskId is required")),
  userId: pipe(string(), minLength(1, "userId is required")),
});

export type AssignTaskInput = InferOutput<typeof AssignTaskSchema>;
