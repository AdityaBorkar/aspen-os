import { maxLength, minLength, pipe, regex, string } from "valibot";

export { HexColorSchema, IdSchema, NameSchema } from "@aspen-os/platform/server";

const PROJECT_KEY_REGEX = /^[A-Z]{2,10}$/;

export const TitleSchema = pipe(
  string(),
  minLength(1, "Title is required"),
  maxLength(500, "Must be at most 500 characters"),
);

export const ProjectKeySchema = pipe(
  string(),
  minLength(2, "Must be at least 2 characters"),
  maxLength(10, "Must be at most 10 characters"),
  regex(PROJECT_KEY_REGEX, "Must be uppercase letters only (2-10 chars)"),
);
