import { productsReorderRule } from "#/db-schemas";
import type { ProductsReorderRule } from "#/db-schemas/reorder-rule";
import { defineFetchByIdStep } from "#/workflow-steps/fetch-by-id";

export const fetchReorderRuleStep = defineFetchByIdStep<ProductsReorderRule>({
  idColumn: productsReorderRule.id,
  label: "Reorder rule",
  stepName: "products-fetch-reorder-rule",
  table: productsReorderRule,
});
