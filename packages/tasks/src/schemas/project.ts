import { ProjectMemberRoleSchema, ProjectStatusSchema } from "#/schemas/enums";
import { NameSchema, ProjectKeySchema } from "#/schemas/utils";

import { date, minLength, nullable, object, optional, pipe, string } from "valibot";
import type { InferOutput } from "valibot";

export const CreateProjectSchema = object({
  defaultTaskTypeId: optional(nullable(string())),
  description: optional(nullable(string())),
  key: ProjectKeySchema,
  leadId: pipe(string(), minLength(1, "leadId is required")),
  name: NameSchema,
  startDate: optional(date()),
  targetDate: optional(date()),
});

export type CreateProjectInput = InferOutput<typeof CreateProjectSchema>;

export const UpdateProjectSchema = object({
  defaultTaskTypeId: optional(nullable(string())),
  description: optional(nullable(string())),
  key: optional(ProjectKeySchema),
  leadId: optional(string()),
  name: optional(NameSchema),
  startDate: optional(date()),
  status: optional(ProjectStatusSchema),
  targetDate: optional(date()),
});

export type UpdateProjectInput = InferOutput<typeof UpdateProjectSchema>;

export const ProjectFiltersSchema = object({
  leadId: optional(string()),
  status: optional(ProjectStatusSchema),
});

export type ProjectFilters = InferOutput<typeof ProjectFiltersSchema>;

export const CreateProjectMemberSchema = object({
  projectId: pipe(string(), minLength(1, "projectId is required")),
  role: optional(ProjectMemberRoleSchema),
  userId: pipe(string(), minLength(1, "userId is required")),
});

export type CreateProjectMemberInput = InferOutput<typeof CreateProjectMemberSchema>;

export const UpdateProjectMemberSchema = object({
  role: optional(ProjectMemberRoleSchema),
});

export type UpdateProjectMemberInput = InferOutput<typeof UpdateProjectMemberSchema>;
