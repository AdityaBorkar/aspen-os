import { NotificationChannelTypeSchema } from "#/schemas/enums";
import { IdSchema } from "#/schemas/utils";

import { boolean, integer, nullable, number, object, optional, pipe, string } from "valibot";
import type { InferOutput } from "valibot";

export const SetPreferenceSchema = object({
  channelType: NotificationChannelTypeSchema,
  enabled: boolean(),
  priority: optional(pipe(number(), integer())),
  type: optional(nullable(string())),
  userId: IdSchema,
});

export type SetPreferenceInput = InferOutput<typeof SetPreferenceSchema>;

export const PreferenceFiltersSchema = object({
  channelType: optional(NotificationChannelTypeSchema),
  type: optional(string()),
  userId: optional(IdSchema),
});

export type PreferenceFilters = InferOutput<typeof PreferenceFiltersSchema>;

export const ListPreferencesSchema = object({
  filters: optional(PreferenceFiltersSchema),
});

export type ListPreferencesInput = InferOutput<typeof ListPreferencesSchema>;

export const GetPreferenceSchema = object({
  channelType: NotificationChannelTypeSchema,
  type: optional(nullable(string())),
  userId: IdSchema,
});

export type GetPreferenceInput = InferOutput<typeof GetPreferenceSchema>;
