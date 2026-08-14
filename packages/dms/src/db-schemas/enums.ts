import { pgEnum } from "drizzle-orm/pg-core";

import {
  ITEM_GRANTEE_TYPE,
  ITEM_PERMISSION,
  ITEM_TYPE,
  PUBLIC_LINK_PERMISSION,
} from "../utils/constants";

export const dmsItemTypeEnum = pgEnum("dms_item_type", [
  ITEM_TYPE.FILE,
  ITEM_TYPE.FOLDER,
]);

export const dmsItemGranteeTypeEnum = pgEnum("dms_item_grantee_type", [
  ITEM_GRANTEE_TYPE.USER,
  ITEM_GRANTEE_TYPE.GROUP,
]);

export const dmsItemPermissionEnum = pgEnum("dms_item_permission", [
  ITEM_PERMISSION.VIEWER,
  ITEM_PERMISSION.EDITOR,
  ITEM_PERMISSION.OWNER,
]);

export const dmsPublicLinkPermissionEnum = pgEnum(
  "dms_public_link_permission",
  [PUBLIC_LINK_PERMISSION.VIEW, PUBLIC_LINK_PERMISSION.EDIT],
);
