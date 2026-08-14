import { pgEnum } from "drizzle-orm/pg-core";

import {
  ENTITY_TYPE,
  FILE_STATUS,
  GRANTEE_TYPE,
  PUBLIC_LINK_PERMISSION,
  SHARE_PERMISSION,
} from "../utils/constants";

export const dmsEntityTypeEnum = pgEnum("dms_entity_type", [ENTITY_TYPE.FILE, ENTITY_TYPE.FOLDER]);

export const dmsFileStatusEnum = pgEnum("dms_file_status", [
  FILE_STATUS.TRIAGED,
  FILE_STATUS.ACTIVE,
  FILE_STATUS.EXPIRED,
  FILE_STATUS.TRASHED,
]);

export const dmsGranteeTypeEnum = pgEnum("dms_grantee_type", [
  GRANTEE_TYPE.USER,
  GRANTEE_TYPE.GROUP,
  GRANTEE_TYPE.CONTACT,
]);

export const dmsSharePermissionEnum = pgEnum("dms_share_permission", [
  SHARE_PERMISSION.VIEWER,
  SHARE_PERMISSION.EDITOR,
  SHARE_PERMISSION.OWNER,
]);

export const dmsPublicLinkPermissionEnum = pgEnum("dms_public_link_permission", [
  PUBLIC_LINK_PERMISSION.VIEW,
  PUBLIC_LINK_PERMISSION.EDIT,
]);
