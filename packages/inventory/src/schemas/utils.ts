import { check, integer, maxLength, minLength, number, pipe, string } from "valibot";

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

export const PrioritySchema = pipe(
  number(),
  integer("Must be an integer"),
  check((value) => value >= 1, "Must be at least 1"),
);
