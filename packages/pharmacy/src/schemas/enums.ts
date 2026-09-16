import { BATCH_STATUS, GRN_STATUS, PO_STATUS, SALE_STATUS } from "#/utils/constants";

import { picklist } from "valibot";

export const BatchStatusSchema = picklist(Object.values(BATCH_STATUS));
export const GrnStatusSchema = picklist(Object.values(GRN_STATUS));
export const PoStatusSchema = picklist(Object.values(PO_STATUS));
export const SaleStatusSchema = picklist(Object.values(SALE_STATUS));

export { BATCH_STATUS, GRN_STATUS, PO_STATUS, SALE_STATUS } from "#/utils/constants";
