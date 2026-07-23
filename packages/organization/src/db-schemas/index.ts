export { address } from "./address";
export { bankAccount } from "./bank-account";
export { branch, branchTypeEnum } from "./branch";
export {
  connection,
  connectionContact,
  connectionNote,
  connectionNoteTypeEnum,
  connectionStatusEnum,
  connectionTypeEnum,
} from "./connection";
export { organization, organizationStatusEnum } from "./organization";

import { address } from "./address";
import { bankAccount } from "./bank-account";
import { branch } from "./branch";
import { connection, connectionContact, connectionNote } from "./connection";
import { organization } from "./organization";

export const schemas = {
  address,
  bankAccount,
  branch,
  connection,
  connectionContact,
  connectionNote,
  organization,
} as const;
