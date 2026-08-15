import {
  ConnectionStatusSchema,
  IntegrationTypeSchema,
  MasterEntityTypeSchema,
} from "#/schemas/enums";
import { IdSchema, NameSchema } from "#/schemas/utils";

import { nullable, object, optional, record, string } from "valibot";
import type { InferOutput } from "valibot";

export const ConnectionCredentialSchema = record(string(), string());

export type ConnectionCredential = InferOutput<typeof ConnectionCredentialSchema>;

export const CreateConnectionSchema = object({
  baseUrl: optional(nullable(string())),
  credential: ConnectionCredentialSchema,
  description: optional(nullable(string())),
  entityId: IdSchema,
  entityType: MasterEntityTypeSchema,
  metadata: optional(nullable(object({}))),
  name: NameSchema,
  status: optional(ConnectionStatusSchema, "active"),
  type: IntegrationTypeSchema,
});

export type CreateConnectionInput = InferOutput<typeof CreateConnectionSchema>;

export const UpdateConnectionSchema = object({
  baseUrl: optional(nullable(string())),
  description: optional(nullable(string())),
  metadata: optional(nullable(object({}))),
  name: optional(NameSchema),
  status: optional(ConnectionStatusSchema),
  type: optional(IntegrationTypeSchema),
});

export type UpdateConnectionInput = InferOutput<typeof UpdateConnectionSchema>;

export const ConnectionFiltersSchema = object({
  search: optional(string()),
  status: optional(ConnectionStatusSchema),
  type: optional(IntegrationTypeSchema),
});

export type ConnectionFilters = InferOutput<typeof ConnectionFiltersSchema>;

export const ListConnectionsSchema = object({
  entityId: IdSchema,
  entityType: MasterEntityTypeSchema,
  filters: optional(ConnectionFiltersSchema),
});

export type ListConnectionsInput = InferOutput<typeof ListConnectionsSchema>;

export const RotateConnectionCredentialSchema = object({
  credential: ConnectionCredentialSchema,
  id: IdSchema,
});

export type RotateConnectionCredentialInput = InferOutput<typeof RotateConnectionCredentialSchema>;
