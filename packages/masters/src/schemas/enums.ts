import {
  CARD_BRAND,
  CONTACT_TYPE,
  CONNECTION_STATUS,
  ENTITY_STATUS,
  INTEGRATION_TYPE,
  MASTER_ENTITY_KIND,
  MASTER_ENTITY_TYPE,
  PAYMENT_METHOD_DIRECTION,
  PAYMENT_METHOD_STATUS,
  PAYMENT_METHOD_TYPE,
  UOM_CATEGORY,
} from "@aspen-os/constants";
import { picklist } from "valibot";

import { FILTER_VIEW_ACCESS, FILTER_VIEW_TYPE } from "../utils/constants";

export const MasterEntityTypeSchema = picklist(Object.values(MASTER_ENTITY_TYPE));

export const EntityTypeSchema = picklist(Object.values(MASTER_ENTITY_KIND));

export const EntityStatusSchema = picklist(Object.values(ENTITY_STATUS));

export const UomCategorySchema = picklist(Object.values(UOM_CATEGORY));

export const PaymentMethodTypeSchema = picklist(Object.values(PAYMENT_METHOD_TYPE));

export const PaymentMethodStatusSchema = picklist(Object.values(PAYMENT_METHOD_STATUS));

export const PaymentMethodDirectionSchema = picklist(Object.values(PAYMENT_METHOD_DIRECTION));

export const CardBrandSchema = picklist(Object.values(CARD_BRAND));

export const ContactTypeSchema = picklist(Object.values(CONTACT_TYPE));

export const IntegrationTypeSchema = picklist(Object.values(INTEGRATION_TYPE));

export const ConnectionStatusSchema = picklist(Object.values(CONNECTION_STATUS));

export const FilterViewAccessSchema = picklist(Object.values(FILTER_VIEW_ACCESS));

export const FilterViewTypeSchema = picklist(Object.values(FILTER_VIEW_TYPE));

export {
  CARD_BRAND,
  CONTACT_TYPE,
  CONNECTION_STATUS,
  ENTITY_STATUS,
  INTEGRATION_TYPE,
  MASTER_ENTITY_KIND,
  MASTER_ENTITY_TYPE,
  PAYMENT_METHOD_DIRECTION,
  PAYMENT_METHOD_STATUS,
  PAYMENT_METHOD_TYPE,
  UOM_CATEGORY,
} from "@aspen-os/constants";

export { FILTER_VIEW_ACCESS, FILTER_VIEW_DOMAIN, FILTER_VIEW_TYPE } from "../utils/constants";
