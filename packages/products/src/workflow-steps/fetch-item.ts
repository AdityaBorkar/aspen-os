import { productsItem } from "#/db-schemas";
import type { ProductsItem } from "#/db-schemas/item";
import { defineFetchByIdStep } from "#/workflow-steps/fetch-by-id";

export const fetchItemStep = defineFetchByIdStep<ProductsItem>({
  idColumn: productsItem.id,
  label: "Item",
  stepName: "products-fetch-item",
  table: productsItem,
});
