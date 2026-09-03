import { object, pipe, regex, string } from "valibot";

export { EmailSchema, IdSchema, NameSchema, SlugSchema } from "@aspen-os/platform/server";

export const WebsiteSchema = pipe(
  string(),
  regex(/^https?:\/\/.+/, "Must be a valid URL starting with http:// or https://"),
);

export const LogoSchema = pipe(
  object({
    contentType: string(),
    size: string(),
  }),
);
