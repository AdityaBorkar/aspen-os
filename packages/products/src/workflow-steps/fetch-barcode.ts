import { productsBarcode } from "#/db-schemas";
import type { ProductsBarcode } from "#/db-schemas/barcode";
import { defineFetchByIdStep } from "#/workflow-steps/fetch-by-id";

export const fetchBarcodeStep = defineFetchByIdStep<ProductsBarcode>({
  idColumn: productsBarcode.id,
  label: "Barcode",
  stepName: "products-fetch-barcode",
  table: productsBarcode,
});
