import { check, maxLength, minLength, object, pipe, regex, string } from "valibot";

export {
  EmailSchema,
  HexColorSchema,
  IdSchema,
  NameSchema,
  WithIdSchema,
} from "@aspen-os/platform/server";

const NAME_NO_SLASH_REGEX = /^[^/]+$/;

export const FileNameSchema = pipe(
  string(),
  minLength(1, "File name is required"),
  maxLength(255, "Must be at most 255 characters"),
  regex(NAME_NO_SLASH_REGEX, "Must not contain slashes"),
  check((val) => !val.includes("\0"), "Must not contain null bytes"),
);

export const LabelNameSchema = pipe(
  string(),
  minLength(1, "Label name is required"),
  maxLength(100, "Must be at most 100 characters"),
);

export const FileIdSchema = string();

export const WithFileIdSchema = object({ id: FileIdSchema });

/**
 * Non-empty string factory shared by DMS schemas. Requires at least one
 * character with a caller-provided message.
 */
export function nonEmptyString(message = "Field is required") {
  return pipe(string(), minLength(1, message));
}
