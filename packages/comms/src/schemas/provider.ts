import { ProviderCredentialSchema } from "#/schemas/channel";
import { ProviderKindSchema } from "#/schemas/enums";
import { MetadataSchema } from "#/schemas/json";
import { IdSchema, NameSchema } from "#/schemas/utils";

import { boolean, nullable, object, optional, string } from "valibot";
import type { InferOutput } from "valibot";

export const CreateProviderSchema = object({
  credential: ProviderCredentialSchema,
  defaultSenderAddress: optional(nullable(string())),
  kind: ProviderKindSchema,
  metadata: optional(nullable(MetadataSchema)),
  name: NameSchema,
});

export type CreateProviderInput = InferOutput<typeof CreateProviderSchema>;

export const UpdateProviderSchema = object({
  defaultSenderAddress: optional(nullable(string())),
  id: IdSchema,
  metadata: optional(nullable(MetadataSchema)),
  name: optional(NameSchema),
});

export type UpdateProviderInput = InferOutput<typeof UpdateProviderSchema>;

export const ProviderFiltersSchema = object({
  isActive: optional(boolean()),
  kind: optional(ProviderKindSchema),
});

export type ProviderFilters = InferOutput<typeof ProviderFiltersSchema>;

export const ListProvidersSchema = object({
  filters: optional(ProviderFiltersSchema),
});

export type ListProvidersInput = InferOutput<typeof ListProvidersSchema>;
