import { picklist } from "valibot";

import {
  COMPRESSION_MODE,
  ENTITY_TYPE,
  FIELD_TYPE,
  FILE_STATUS,
  GRANTEE_TYPE,
  PIN_ITEM_TYPE,
  PUBLIC_LINK_PERMISSION,
  SHARE_PERMISSION,
} from "../utils/constants";

export const FileStatusSchema = picklist(Object.values(FILE_STATUS));

export const EntityTypeSchema = picklist(Object.values(ENTITY_TYPE));

export const GranteeTypeSchema = picklist(Object.values(GRANTEE_TYPE));

export const SharePermissionSchema = picklist(Object.values(SHARE_PERMISSION));

export const PublicLinkPermissionSchema = picklist(Object.values(PUBLIC_LINK_PERMISSION));

export const PinItemTypeSchema = picklist(Object.values(PIN_ITEM_TYPE));

export const CompressionModeSchema = picklist(Object.values(COMPRESSION_MODE));

export const FieldTypeSchema = picklist(Object.values(FIELD_TYPE));

export {
  COMPRESSION_MODE,
  ENTITY_TYPE,
  FIELD_TYPE,
  FILE_STATUS,
  GRANTEE_TYPE,
  PIN_ITEM_TYPE,
  PUBLIC_LINK_PERMISSION,
  SHARE_PERMISSION,
};
