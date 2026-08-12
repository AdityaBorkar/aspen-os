export { driveAccessLog } from "./access-log";
export {
  driveGranteeTypeEnum,
  driveItemTypeEnum,
  drivePermissionEnum,
  drivePublicLinkPermissionEnum,
} from "./enums";
export { driveFile } from "./file";
export { driveFileVersion } from "./file-version";
export { driveFolder } from "./folder";
export { driveItemLabel } from "./item-label";
export { driveLabel } from "./label";
export { drivePublicLink } from "./public-link";
export { driveShare } from "./share";

import { driveAccessLog } from "./access-log";
import { driveFile } from "./file";
import { driveFileVersion } from "./file-version";
import { driveFolder } from "./folder";
import { driveItemLabel } from "./item-label";
import { driveLabel } from "./label";
import { drivePublicLink } from "./public-link";
import { driveShare } from "./share";

export const driveTables = {
  driveAccessLog,
  driveFile,
  driveFileVersion,
  driveFolder,
  driveItemLabel,
  driveLabel,
  drivePublicLink,
  driveShare,
} as const;

export const control_plane_schemas = {} as const;

export const tenant_schemas = driveTables;
