import { JsonValueSchema } from "#/schemas/json";

import { object, string } from "valibot";

export const GetSettingSchema = object({
  key: string(),
});

export const SetSettingSchema = object({
  key: string(),
  value: JsonValueSchema,
});
