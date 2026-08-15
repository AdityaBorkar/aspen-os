export { address } from "#/db-schemas/address";
export { bankAccount } from "#/db-schemas/bank-account";
export { branch, branchTypeEnum } from "#/db-schemas/branch";
export {
  connection,
  connectionContact,
  connectionNote,
  connectionNoteTypeEnum,
  connectionStatusEnum,
  connectionTypeEnum,
} from "#/db-schemas/connection";
export { organization, organizationStatusEnum } from "#/db-schemas/organization";

import { address } from "#/db-schemas/address";
import { bankAccount } from "#/db-schemas/bank-account";
import { branch } from "#/db-schemas/branch";
import { connection, connectionContact, connectionNote } from "#/db-schemas/connection";
import { organization } from "#/db-schemas/organization";

export const control_plane_schemas = {} as const;

export const tenant_schemas = {
  address,
  bankAccount,
  branch,
  connection,
  connectionContact,
  connectionNote,
  organization,
} as const;
