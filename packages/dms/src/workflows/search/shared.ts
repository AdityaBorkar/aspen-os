import { SearchOptionsSchema } from "#/types";

import { object, string } from "valibot";

export const SearchInputSchema = object({
  options: SearchOptionsSchema,
  query: string(),
});
