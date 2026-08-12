import { picklist } from "valibot";

import {
  DRIVE_GRANTEE_TYPE,
  DRIVE_ITEM_TYPE,
  DRIVE_PERMISSION,
  DRIVE_PUBLIC_LINK_PERMISSION,
} from "../utils/constants";

export const DriveItemTypeSchema = picklist(Object.values(DRIVE_ITEM_TYPE));

export const DriveGranteeTypeSchema = picklist(
  Object.values(DRIVE_GRANTEE_TYPE),
);

export const DrivePermissionSchema = picklist(Object.values(DRIVE_PERMISSION));

export const DrivePublicLinkPermissionSchema = picklist(
  Object.values(DRIVE_PUBLIC_LINK_PERMISSION),
);

export {
  DRIVE_GRANTEE_TYPE,
  DRIVE_ITEM_TYPE,
  DRIVE_PERMISSION,
  DRIVE_PUBLIC_LINK_PERMISSION,
};

export const DriveSearchScopeSchema = picklist([
  "all",
  "my_files",
  "shared_with_me",
]);

export const DriveSortOrderSchema = picklist(["asc", "desc"]);
