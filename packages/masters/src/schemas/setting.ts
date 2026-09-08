import { JsonValueSchema } from "@aspen-os/platform/server";
import { object, optional, pipe, regex, string } from "valibot";
import type { InferOutput } from "valibot";

export const GetSettingSchema = object({
  key: string(),
});

export type GetSettingInput = InferOutput<typeof GetSettingSchema>;

export const SetSettingSchema = object({
  key: string(),
  value: JsonValueSchema,
});

export type SetSettingInput = InferOutput<typeof SetSettingSchema>;

const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;

/** Shape of the `org.branding` setting value. */
export const OrgBrandingSchema = object({
  accentColor: optional(pipe(string(), regex(HEX_COLOR_REGEX, "Must be a 6-digit hex color"))),
  name: optional(string()),
});

export type OrgBranding = InferOutput<typeof OrgBrandingSchema>;
