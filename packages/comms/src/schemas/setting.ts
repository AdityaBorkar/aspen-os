import { JsonValueSchema } from "#/schemas/json";
import { SETTING_KEYS } from "#/utils/constants";

import { object, picklist } from "valibot";
import type { InferOutput } from "valibot";

export const SettingKeySchema = picklist(Object.values(SETTING_KEYS));

export const GetSettingSchema = object({
  key: SettingKeySchema,
});

export type GetSettingInput = InferOutput<typeof GetSettingSchema>;

export const SetSettingSchema = object({
  key: SettingKeySchema,
  value: JsonValueSchema,
});

export type SetSettingInput = InferOutput<typeof SetSettingSchema>;

export const ListSettingsSchema = object({});

export type ListSettingsInput = InferOutput<typeof ListSettingsSchema>;

export const SettingValueSchema = JsonValueSchema;

export type SettingValue = InferOutput<typeof SettingValueSchema>;
