import { productsItemPrice } from "#/db-schemas";
import type { ProductsItemPrice } from "#/db-schemas/item-price";
import { defineFetchByIdStep } from "#/workflow-steps/fetch-by-id";

export const fetchItemPriceStep = defineFetchByIdStep<ProductsItemPrice>({
  idColumn: productsItemPrice.id,
  label: "Item price",
  stepName: "products-fetch-item-price",
  table: productsItemPrice,
});
