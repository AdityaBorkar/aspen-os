import type { SchemaMap } from "@aspen-os/platform/server";

export { healthcareCounter } from "#/db-schemas/counter";
export {
  healthcarePharmacyItem,
  healthcarePharmacyBatch,
  healthcarePharmacySale,
  healthcarePharmacyReturn,
  healthcarePurchaseOrder,
  healthcareGrn,
  healthcarePurchaseInvoice,
  healthcareStockTransfer,
} from "#/db-schemas/pharmacy";

import { healthcareCounter } from "#/db-schemas/counter";
import {
  healthcarePharmacyItem,
  healthcarePharmacyBatch,
  healthcarePharmacySale,
  healthcarePharmacyReturn,
  healthcarePurchaseOrder,
  healthcareGrn,
  healthcarePurchaseInvoice,
  healthcareStockTransfer,
} from "#/db-schemas/pharmacy";

export const pharmacyTables: SchemaMap = {
  healthcareCounter,
  healthcareGrn,
  healthcarePharmacyBatch,
  healthcarePharmacyItem,
  healthcarePharmacyReturn,
  healthcarePharmacySale,
  healthcarePurchaseInvoice,
  healthcarePurchaseOrder,
  healthcareStockTransfer,
} as const;

export const control_plane_schemas = {} as const;

export const tenant_schemas: SchemaMap = pharmacyTables;
