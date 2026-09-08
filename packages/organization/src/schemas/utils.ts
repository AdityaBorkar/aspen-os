import { maxLength, minLength, pipe, regex, string } from "valibot";

export { NameSchema } from "@aspen-os/platform/server";

const BRANCH_CODE_REGEX = /^[A-Za-z0-9]+(?<suffix>-[A-Za-z0-9]+)*$/;

export const BranchCodeSchema = pipe(
  string(),
  minLength(2, "Must be at least 2 characters"),
  maxLength(20, "Must be at most 20 characters"),
  regex(BRANCH_CODE_REGEX, "Must be alphanumeric with hyphens"),
);
