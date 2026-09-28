import { productsPriceList } from "#/db-schemas";
import type { ProductsPriceList } from "#/db-schemas/price-list";
import { defineFetchByIdStep } from "#/workflow-steps/fetch-by-id";

export const fetchPriceListStep = defineFetchByIdStep<ProductsPriceList>({
  idColumn: productsPriceList.id,
  label: "Price list",
  stepName: "products-fetch-price-list",
  table: productsPriceList,
});
