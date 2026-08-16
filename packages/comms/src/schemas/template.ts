import { ChannelTypeSchema } from "#/schemas/enums";
import { MetadataSchema } from "#/schemas/json";
import { IdSchema, NameSchema } from "#/schemas/utils";

import { boolean, nullable, object, optional, string } from "valibot";
import type { InferOutput } from "valibot";

export const CreateTemplateSchema = object({
  body: string(),
  channelType: ChannelTypeSchema,
  metadata: optional(nullable(MetadataSchema)),
  name: NameSchema,
  providerTemplateId: optional(nullable(string())),
  subject: optional(nullable(string())),
});

export type CreateTemplateInput = InferOutput<typeof CreateTemplateSchema>;

export const UpdateTemplateSchema = object({
  body: optional(string()),
  id: IdSchema,
  metadata: optional(nullable(MetadataSchema)),
  name: optional(NameSchema),
  providerTemplateId: optional(nullable(string())),
  subject: optional(nullable(string())),
});

export type UpdateTemplateInput = InferOutput<typeof UpdateTemplateSchema>;

export const TemplateFiltersSchema = object({
  channelType: optional(ChannelTypeSchema),
  isActive: optional(boolean()),
  name: optional(string()),
});

export type TemplateFilters = InferOutput<typeof TemplateFiltersSchema>;

export const ListTemplatesSchema = object({
  filters: optional(TemplateFiltersSchema),
});

export type ListTemplatesInput = InferOutput<typeof ListTemplatesSchema>;
