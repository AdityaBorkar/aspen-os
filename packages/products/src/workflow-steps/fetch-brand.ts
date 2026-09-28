import { productsBrand } from "#/db-schemas";
import type { ProductsBrand } from "#/db-schemas/brand";
import { defineFetchByIdStep } from "#/workflow-steps/fetch-by-id";

export const fetchBrandStep = defineFetchByIdStep<ProductsBrand>({
  idColumn: productsBrand.id,
  label: "Brand",
  stepName: "products-fetch-brand",
  table: productsBrand,
});
