import { masterAddress } from "#/db-schemas/address";
import { masterBankAccount } from "#/db-schemas/bank-account";
import { masterConnection } from "#/db-schemas/connection";
import { masterContact } from "#/db-schemas/contact";
import { masterNote } from "#/db-schemas/note";

export { masterAddress } from "#/db-schemas/address";
export { masterBankAccount } from "#/db-schemas/bank-account";
export { masterConnection } from "#/db-schemas/connection";
export { masterContact } from "#/db-schemas/contact";
export {
  masterConnectionStatusEnum,
  masterContactTypeEnum,
  masterEntityTypeEnum,
  masterIntegrationTypeEnum,
  masterNoteTypeEnum,
} from "#/db-schemas/enums";
export { masterNote } from "#/db-schemas/note";

export const mastersTables = {
  masterAddress,
  masterBankAccount,
  masterConnection,
  masterContact,
  masterNote,
} as const;

export const control_plane_schemas = {} as const;

export const tenant_schemas = mastersTables;
