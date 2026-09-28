import { productsItemGroup } from "#/db-schemas";
import type { ProductsItemGroup } from "#/db-schemas/item-group";
import { defineFetchByIdStep } from "#/workflow-steps/fetch-by-id";

export const fetchGroupStep = defineFetchByIdStep<ProductsItemGroup>({
  idColumn: productsItemGroup.id,
  label: "Item group",
  stepName: "products-fetch-group",
  table: productsItemGroup,
});
