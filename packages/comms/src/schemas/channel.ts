import {
  ChannelSourceSchema,
  ChannelStatusSchema,
  ChannelTypeSchema,
  MasterEntityTypeSchema,
} from "#/schemas/enums";
import { MetadataSchema } from "#/schemas/json";
import { IdSchema, NameSchema } from "#/schemas/utils";

import {
  array,
  boolean,
  integer,
  nullable,
  number,
  object,
  optional,
  pipe,
  record,
  string,
} from "valibot";
import type { InferOutput } from "valibot";

export const ProviderCredentialSchema = record(string(), string());

export type ProviderCredential = InferOutput<typeof ProviderCredentialSchema>;

export const CreateChannelSchema = object({
  credential: ProviderCredentialSchema,
  entityId: IdSchema,
  entityType: MasterEntityTypeSchema,
  metadata: optional(nullable(MetadataSchema)),
  name: NameSchema,
  senderAddress: string(),
  type: ChannelTypeSchema,
});

export type CreateChannelInput = InferOutput<typeof CreateChannelSchema>;

export const UpdateChannelSchema = object({
  id: IdSchema,
  metadata: optional(nullable(MetadataSchema)),
  name: optional(NameSchema),
  senderAddress: optional(string()),
});

export type UpdateChannelInput = InferOutput<typeof UpdateChannelSchema>;

export const ChannelFiltersSchema = object({
  entityId: optional(IdSchema),
  entityType: optional(MasterEntityTypeSchema),
  isDefault: optional(boolean()),
  limit: optional(pipe(number(), integer())),
  offset: optional(pipe(number(), integer())),
  source: optional(ChannelSourceSchema),
  status: optional(ChannelStatusSchema),
  type: optional(ChannelTypeSchema),
});

export type ChannelFilters = InferOutput<typeof ChannelFiltersSchema>;

export const ListChannelsSchema = object({
  filters: optional(ChannelFiltersSchema),
});

export type ListChannelsInput = InferOutput<typeof ListChannelsSchema>;

export const TestChannelSchema = object({
  id: IdSchema,
  recipientAddress: optional(string()),
});

export type TestChannelInput = InferOutput<typeof TestChannelSchema>;

export const SetDefaultChannelSchema = object({
  id: IdSchema,
});

export type SetDefaultChannelInput = InferOutput<typeof SetDefaultChannelSchema>;

export const RotateChannelCredentialSchema = object({
  credential: ProviderCredentialSchema,
  id: IdSchema,
});

export type RotateChannelCredentialInput = InferOutput<typeof RotateChannelCredentialSchema>;

export const DeleteChannelSchema = object({
  id: IdSchema,
});

export type DeleteChannelInput = InferOutput<typeof DeleteChannelSchema>;

export const EnsureDefaultsSchema = object({
  channelTypes: optional(array(ChannelTypeSchema)),
  entityId: optional(IdSchema),
  entityType: optional(MasterEntityTypeSchema),
});

export type EnsureDefaultsInput = InferOutput<typeof EnsureDefaultsSchema>;

export const ActivateChannelSchema = object({ id: IdSchema });
export type ActivateChannelInput = InferOutput<typeof ActivateChannelSchema>;

export const DeactivateChannelSchema = object({ id: IdSchema });
export type DeactivateChannelInput = InferOutput<typeof DeactivateChannelSchema>;
