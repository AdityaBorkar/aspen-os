import { LAB_ORDER_STATUS, RADIO_ORDER_STATUS } from "#/utils/constants";

import { picklist } from "valibot";

export const LabOrderStatusSchema = picklist(Object.values(LAB_ORDER_STATUS));
export const RadioOrderStatusSchema = picklist(Object.values(RADIO_ORDER_STATUS));

export { LAB_ORDER_STATUS, RADIO_ORDER_STATUS } from "#/utils/constants";
