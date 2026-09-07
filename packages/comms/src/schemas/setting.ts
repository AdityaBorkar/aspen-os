import { JsonValueSchema } from "#/schemas/json";
import { SETTING_KEYS } from "#/utils/constants";

import { boolean, literal, nullable, object, picklist, record, string, variant } from "valibot";
import type { InferOutput } from "valibot";

export const SettingKeySchema = picklist(Object.values(SETTING_KEYS));

export const DefaultChannelsValueSchema = nullable(record(string(), string()));

export const SuppressOutOfBandValueSchema = boolean();

export const SenderOverrideValueSchema = nullable(string());

export const GetSettingSchema = object({
  key: SettingKeySchema,
});

export type GetSettingInput = InferOutput<typeof GetSettingSchema>;

export const SetSettingSchema = variant("key", [
  object({ key: literal(SETTING_KEYS.DEFAULT_CHANNELS), value: DefaultChannelsValueSchema }),
  object({ key: literal(SETTING_KEYS.SUPPRESS_OUT_OF_BAND), value: SuppressOutOfBandValueSchema }),
  object({
    key: literal(SETTING_KEYS.HOST_DEFAULT_SENDER_ADDRESS_OVERRIDE),
    value: SenderOverrideValueSchema,
  }),
]);

export type SetSettingInput = InferOutput<typeof SetSettingSchema>;

export const ListSettingsSchema = object({});

export type ListSettingsInput = InferOutput<typeof ListSettingsSchema>;

export const SettingValueSchema = JsonValueSchema;

export type SettingValue = InferOutput<typeof SettingValueSchema>;
