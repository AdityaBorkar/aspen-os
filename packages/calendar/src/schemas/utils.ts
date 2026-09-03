import { minLength, pipe, string } from "valibot";

export {
  EmailSchema,
  HexColorSchema,
  IdSchema,
  NameSchema,
  ScopeTypeSchema,
  WithIdSchema,
} from "@aspen-os/platform/server";

export const TimezoneSchema = pipe(string(), minLength(1, "timezone is required"));
