import { dmsAccessLog } from "#/db-schemas/access-log";
import { dmsClass } from "#/db-schemas/class";
import { dmsClassField } from "#/db-schemas/class-field";
import { dmsContact } from "#/db-schemas/contact";
import { dmsEntityLabel } from "#/db-schemas/entity-label";
import { dmsFile } from "#/db-schemas/file";
import { dmsFileVersion } from "#/db-schemas/file-version";
import { dmsFileView } from "#/db-schemas/file-view";
import { dmsFolder } from "#/db-schemas/folder";
import { dmsLabel } from "#/db-schemas/label";
import { dmsLegalHold } from "#/db-schemas/legal-hold";
import { dmsPublicLink } from "#/db-schemas/public-link";
import { dmsSetting } from "#/db-schemas/setting";
import { dmsShare } from "#/db-schemas/share";

export { dmsAccessLog } from "#/db-schemas/access-log";
export { dmsClass } from "#/db-schemas/class";
export { dmsClassField, dmsFieldTypeEnum } from "#/db-schemas/class-field";
export { dmsContact } from "#/db-schemas/contact";
export { dmsEntityLabel } from "#/db-schemas/entity-label";
export {
  dmsEntityTypeEnum,
  dmsFileStatusEnum,
  dmsGranteeTypeEnum,
  dmsPublicLinkPermissionEnum,
  dmsSharePermissionEnum,
} from "#/db-schemas/enums";
export { dmsFile } from "#/db-schemas/file";
export { dmsFileVersion } from "#/db-schemas/file-version";
export { dmsFileView } from "#/db-schemas/file-view";
export { dmsFolder } from "#/db-schemas/folder";
export { dmsLabel } from "#/db-schemas/label";
export { dmsLegalHold } from "#/db-schemas/legal-hold";
export { dmsPublicLink } from "#/db-schemas/public-link";
export { dmsSetting } from "#/db-schemas/setting";
export { dmsShare } from "#/db-schemas/share";

export const dmsTables = {
  dmsAccessLog,
  dmsClass,
  dmsClassField,
  dmsContact,
  dmsEntityLabel,
  dmsFile,
  dmsFileVersion,
  dmsFileView,
  dmsFolder,
  dmsLabel,
  dmsLegalHold,
  dmsPublicLink,
  dmsSetting,
  dmsShare,
} as const;

export const control_plane_schemas = {} as const;

export const tenant_schemas = dmsTables;
