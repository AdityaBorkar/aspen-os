import { picklist } from "valibot";

import {
  ITEM_GRANTEE_TYPE,
  ITEM_PERMISSION,
  ITEM_TYPE,
  PUBLIC_LINK_PERMISSION,
} from "../utils/constants";

export const ItemTypeSchema = picklist(Object.values(ITEM_TYPE));

export const ItemGranteeTypeSchema = picklist(Object.values(ITEM_GRANTEE_TYPE));

export const ItemPermissionSchema = picklist(Object.values(ITEM_PERMISSION));

export const PublicLinkPermissionSchema = picklist(
  Object.values(PUBLIC_LINK_PERMISSION),
);

export {
  ITEM_GRANTEE_TYPE,
  ITEM_PERMISSION,
  ITEM_TYPE,
  PUBLIC_LINK_PERMISSION,
};

export const DriveSearchScopeSchema = picklist([
  "all",
  "my_files",
  "shared_with_me",
]);

export const DriveSortOrderSchema = picklist(["asc", "desc"]);
