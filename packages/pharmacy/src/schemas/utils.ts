import {
  integer,
  maxLength,
  minLength,
  number,
  object,
  optional,
  pipe,
  regex,
  string,
} from "valibot";
import type { InferOutput } from "valibot";

export {
  EmailSchema,
  HexColorSchema,
  IdSchema,
  NameSchema,
  WithIdSchema,
} from "@aspen-os/platform/server";

export const BranchIdSchema = optional(string(), "main");

const PHONE_REGEX = /^[+0-9][0-9\s-]*$/;

export const PhoneSchema = pipe(
  string(),
  minLength(7, "Must be at least 7 characters"),
  maxLength(20, "Must be at most 20 characters"),
  regex(PHONE_REGEX, "Must be a valid phone number"),
);

const DATE_STRING_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const DateStringSchema = pipe(
  string(),
  regex(DATE_STRING_REGEX, "Must be a date string (YYYY-MM-DD)"),
);

export const PaginationSchema = object({
  limit: optional(pipe(number(), integer())),
  offset: optional(pipe(number(), integer())),
});

export type PaginationInput = InferOutput<typeof PaginationSchema>;
