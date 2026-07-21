import {
  boolean,
  type InferOutput,
  integer,
  nullable,
  number,
  object,
  optional,
  pipe,
  string,
} from "valibot";

import { NameSchema, SlugSchema } from "./utils";

export const ProvisioningInputSchema = object({
  databaseHost: optional(nullable(string())),
  databaseName: optional(nullable(string())),
  databasePassword: optional(nullable(string())),
  databasePort: optional(nullable(pipe(number(), integer()))),
  databaseSsl: optional(nullable(boolean())),
  databaseUser: optional(nullable(string())),
  logo: optional(nullable(string())),
  name: NameSchema,
  plan: optional(nullable(string())),
  serviceProviderId: optional(nullable(string())),
  slug: SlugSchema,
});

export type ProvisioningInput = InferOutput<typeof ProvisioningInputSchema>;
