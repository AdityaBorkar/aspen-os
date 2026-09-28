import { productsItemUom } from "#/db-schemas";
import type { ProductsItemUom } from "#/db-schemas/item-uom";
import { defineFetchByIdStep } from "#/workflow-steps/fetch-by-id";

export const fetchItemUomStep = defineFetchByIdStep<ProductsItemUom>({
  idColumn: productsItemUom.id,
  label: "Item UOM",
  stepName: "products-fetch-item-uom",
  table: productsItemUom,
});
