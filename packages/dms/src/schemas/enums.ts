import { picklist } from "valibot";

import {
  COMPRESSION_MODE,
  DOCUMENT_STATUS,
  FIELD_TYPE,
  GRANTEE_TYPE,
  PIN_ITEM_TYPE,
  SHARE_PERMISSION,
} from "../utils/constants";

export const DocumentStatusSchema = picklist(Object.values(DOCUMENT_STATUS));

export const FieldTypeSchema = picklist(Object.values(FIELD_TYPE));

export const GranteeTypeSchema = picklist(Object.values(GRANTEE_TYPE));

export const SharePermissionSchema = picklist(Object.values(SHARE_PERMISSION));

export const PinItemTypeSchema = picklist(Object.values(PIN_ITEM_TYPE));

export const CompressionModeSchema = picklist(Object.values(COMPRESSION_MODE));

export {
  COMPRESSION_MODE,
  DOCUMENT_STATUS,
  FIELD_TYPE,
  GRANTEE_TYPE,
  PIN_ITEM_TYPE,
  SHARE_PERMISSION,
};
