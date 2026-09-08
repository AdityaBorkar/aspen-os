import { integer, number, optional, pipe, regex, string } from "valibot";

export {
  EmailSchema,
  HexColorSchema,
  IdSchema,
  NameSchema,
  SlugSchema,
} from "@aspen-os/platform/server";

export const LimitSchema = optional(pipe(number(), integer()));

export const OffsetSchema = optional(pipe(number(), integer()));

export const WebsiteSchema = pipe(
  string(),
  regex(/^https?:\/\/.+/, "Must be a valid URL starting with http:// or https://"),
);
