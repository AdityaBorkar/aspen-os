import { integer, maxValue, minValue, nullish, number, object, optional, pipe } from "valibot";
import type { BaseIssue, BaseSchema, InferOutput } from "valibot";

export { EmailSchema, HexColorSchema, NameSchema } from "@aspen-os/platform/server";
export { IdSchema, WithIdSchema } from "@aspen-os/platform/server";

/**
 * 3-state update protocol for nullable fields: absent (undefined) means ignore,
 * null means clear, and a value means set. Use in Update* schemas instead of the
 * redundant nullish(nullable(...)).
 */
export function clearable<const TWrapped extends BaseSchema<unknown, unknown, BaseIssue<unknown>>>(
  wrapped: TWrapped,
) {
  return nullish(wrapped);
}

export const ListPaginationSchema = object({
  limit: optional(pipe(number(), integer(), minValue(0), maxValue(500))),
  offset: optional(pipe(number(), integer(), minValue(0))),
});

export type ListPaginationInput = InferOutput<typeof ListPaginationSchema>;
