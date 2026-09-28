import { productsAttribute } from "#/db-schemas";
import type { ProductsAttribute } from "#/db-schemas/attribute";
import { defineFetchByIdStep } from "#/workflow-steps/fetch-by-id";

export const fetchAttributeStep = defineFetchByIdStep<ProductsAttribute>({
  idColumn: productsAttribute.id,
  label: "Attribute",
  stepName: "products-fetch-attribute",
  table: productsAttribute,
});
