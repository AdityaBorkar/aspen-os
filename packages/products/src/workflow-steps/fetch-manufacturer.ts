import { productsManufacturer } from "#/db-schemas";
import type { ProductsManufacturer } from "#/db-schemas/manufacturer";
import { defineFetchByIdStep } from "#/workflow-steps/fetch-by-id";

export const fetchManufacturerStep = defineFetchByIdStep<ProductsManufacturer>({
  idColumn: productsManufacturer.id,
  label: "Manufacturer",
  stepName: "products-fetch-manufacturer",
  table: productsManufacturer,
});
