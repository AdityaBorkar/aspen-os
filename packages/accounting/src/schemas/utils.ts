import { integer, minLength, minValue, number, optional, pipe, string } from "valibot";

export const IdSchema = pipe(string(), minLength(1, "id is required"));

export const WithIdSchema = pipe(string(), minLength(1, "id is required"));

export const NameSchema = pipe(string(), minLength(1, "Name is required"));

export const MoneySchema = number();

export const PositiveMoneySchema = number();

export const QuantitySchema = number();

export const PaginationSchema = {
  limit: optional(pipe(number(), integer(), minValue(1))),
  offset: optional(pipe(number(), integer(), minValue(0))),
};
