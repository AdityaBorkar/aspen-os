import { IdSchema as PlatformIdSchema } from "@aspen-os/platform/server";
import {
  array,
  check,
  integer,
  maxLength,
  minLength,
  nullable,
  number,
  object,
  optional,
  pipe,
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

export const WarehouseNameSchema = pipe(
  string(),
  minLength(1, "Warehouse name is required"),
  maxLength(255, "Must be at most 255 characters"),
);

export const QuantitySchema = pipe(
  number(),
  check((value) => Number.isFinite(value), "Must be a finite number"),
);

export const PositiveQuantitySchema = pipe(
  number(),
  check((value) => Number.isFinite(value) && value > 0, "Must be greater than zero"),
);

export const DateStringSchema = pipe(
  string(),
  minLength(1, "Date is required"),
  check((value) => !Number.isNaN(Date.parse(value)), "Must be a valid date"),
);

export const PaginationSchema = object({
  limit: optional(pipe(number(), integer("Must be an integer")), 50),
  offset: optional(pipe(number(), integer("Must be an integer")), 0),
});

export type PaginationInput = InferOutput<typeof PaginationSchema>;

export const SerialNosSchema = optional(
  array(pipe(string(), minLength(1, "Serial number is required"))),
  [],
);

export const DocActionSchema = object({
  actorRole: optional(nullable(string())),
  id: PlatformIdSchema,
});
