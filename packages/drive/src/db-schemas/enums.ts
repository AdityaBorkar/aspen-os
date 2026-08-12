import { pgEnum } from "drizzle-orm/pg-core";

import {
  DRIVE_GRANTEE_TYPE,
  DRIVE_ITEM_TYPE,
  DRIVE_PERMISSION,
  DRIVE_PUBLIC_LINK_PERMISSION,
} from "../utils/constants";

export const driveItemTypeEnum = pgEnum("drive_item_type", [
  DRIVE_ITEM_TYPE.FILE,
  DRIVE_ITEM_TYPE.FOLDER,
]);

export const driveGranteeTypeEnum = pgEnum("drive_grantee_type", [
  DRIVE_GRANTEE_TYPE.USER,
  DRIVE_GRANTEE_TYPE.GROUP,
]);

export const drivePermissionEnum = pgEnum("drive_permission", [
  DRIVE_PERMISSION.VIEWER,
  DRIVE_PERMISSION.EDITOR,
  DRIVE_PERMISSION.OWNER,
]);

export const drivePublicLinkPermissionEnum = pgEnum(
  "drive_public_link_permission",
  [DRIVE_PUBLIC_LINK_PERMISSION.VIEW, DRIVE_PUBLIC_LINK_PERMISSION.EDIT],
);
