import { createAddress } from "#/workflows/address/create";
import { deleteAddress } from "#/workflows/address/delete";
import { getAddress } from "#/workflows/address/get";
import { listAddresses } from "#/workflows/address/list";
import { setPrimaryAddress } from "#/workflows/address/primary/set";
import { updateAddress } from "#/workflows/address/update";
import { activateBankAccount } from "#/workflows/bank-account/activate";
import { createBankAccount } from "#/workflows/bank-account/create";
import { deactivateBankAccount } from "#/workflows/bank-account/deactivate";
import { deleteBankAccount } from "#/workflows/bank-account/delete";
import { getBankAccount } from "#/workflows/bank-account/get";
import { listBankAccounts } from "#/workflows/bank-account/list";
import { setPrimaryBankAccount } from "#/workflows/bank-account/primary/set";
import { updateBankAccount } from "#/workflows/bank-account/update";
import { activateConnection } from "#/workflows/connection/activate";
import { deactivateConnection } from "#/workflows/connection/deactivate";
import { deleteConnection } from "#/workflows/connection/delete";
import { getConnection } from "#/workflows/connection/get";
import { listConnections } from "#/workflows/connection/list";
import { testConnection } from "#/workflows/connection/test";
import { updateConnection } from "#/workflows/connection/update";
import { createContact } from "#/workflows/contact/create";
import { deleteContact } from "#/workflows/contact/delete";
import { getContact } from "#/workflows/contact/get";
import { listContacts } from "#/workflows/contact/list";
import { setPrimaryContact } from "#/workflows/contact/primary/set";
import { updateContact } from "#/workflows/contact/update";
import { addNote } from "#/workflows/note/add";
import { listNotes } from "#/workflows/note/list";
import { removeNote } from "#/workflows/note/remove";

export const addresses = {
  create: createAddress,
  delete: deleteAddress,
  get: getAddress,
  list: listAddresses,
  setPrimary: setPrimaryAddress,
  update: updateAddress,
} as const;

export const bankAccounts = {
  activate: activateBankAccount,
  create: createBankAccount,
  deactivate: deactivateBankAccount,
  delete: deleteBankAccount,
  get: getBankAccount,
  list: listBankAccounts,
  setPrimary: setPrimaryBankAccount,
  update: updateBankAccount,
} as const;

export const contacts = {
  create: createContact,
  delete: deleteContact,
  get: getContact,
  list: listContacts,
  setPrimary: setPrimaryContact,
  update: updateContact,
} as const;

export const notes = {
  add: addNote,
  list: listNotes,
  remove: removeNote,
} as const;

export const connectionActions = {
  activate: activateConnection,
  deactivate: deactivateConnection,
  delete: deleteConnection,
  get: getConnection,
  list: listConnections,
  test: testConnection,
  update: updateConnection,
} as const;
