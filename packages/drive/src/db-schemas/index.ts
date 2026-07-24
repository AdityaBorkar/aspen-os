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

export const schemas = driveTables;
