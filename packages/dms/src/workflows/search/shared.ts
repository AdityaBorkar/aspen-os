import { object, string } from "valibot";

import { SearchOptionsSchema } from "../../types";

export const SearchInputSchema = object({
  options: SearchOptionsSchema,
  query: string(),
});
