import { ProjectMemberRoleSchema, ProjectStatusSchema } from "#/schemas/enums";
import { IdSchema, NameSchema, ProjectKeySchema } from "#/schemas/utils";

import { date, nullable, object, omit, optional, partial, string } from "valibot";
import type { InferOutput } from "valibot";

export const CreateProjectSchema = object({
  defaultTaskTypeId: optional(nullable(IdSchema)),
  description: optional(nullable(string())),
  key: ProjectKeySchema,
  leadId: IdSchema,
  name: NameSchema,
  startDate: optional(date()),
  targetDate: optional(date()),
});

export type CreateProjectInput = InferOutput<typeof CreateProjectSchema>;

const UpdatableProjectSchema = omit(CreateProjectSchema, ["leadId"]);

export const UpdateProjectSchema = object({
  ...partial(UpdatableProjectSchema).entries,
  leadId: optional(IdSchema),
  status: optional(ProjectStatusSchema),
});

export type UpdateProjectInput = InferOutput<typeof UpdateProjectSchema>;

export const ProjectFiltersSchema = object({
  leadId: optional(IdSchema),
  status: optional(ProjectStatusSchema),
});

export type ProjectFilters = InferOutput<typeof ProjectFiltersSchema>;

export const CreateProjectMemberSchema = object({
  projectId: IdSchema,
  role: optional(ProjectMemberRoleSchema),
  userId: IdSchema,
});

export type CreateProjectMemberInput = InferOutput<typeof CreateProjectMemberSchema>;

export const UpdateProjectMemberSchema = object({
  role: optional(ProjectMemberRoleSchema),
});

export type UpdateProjectMemberInput = InferOutput<typeof UpdateProjectMemberSchema>;
