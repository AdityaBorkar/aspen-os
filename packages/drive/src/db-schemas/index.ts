export {
  driveAccessLog,
  driveFile,
  driveFileVersion,
  driveFolder,
  driveGranteeTypeEnum,
  driveItemLabel,
  driveItemTypeEnum,
  driveLabel,
  drivePermissionEnum,
  drivePublicLink,
  drivePublicLinkPermissionEnum,
  driveShare,
  driveTables,
} from "../db-schema";

import { driveTables } from "../db-schema";

export const control_plane_schemas = {} as Record<string, unknown>;

export const tenant_schemas = driveTables;
