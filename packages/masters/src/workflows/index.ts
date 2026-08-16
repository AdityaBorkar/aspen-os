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
import { createEntity } from "#/workflows/entity/create";
import { deleteEntity } from "#/workflows/entity/delete";
import { getEntity } from "#/workflows/entity/get";
import { listEntities } from "#/workflows/entity/list";
import { setEntityStatus } from "#/workflows/entity/status/set";
import { updateEntity } from "#/workflows/entity/update";
import { addNote } from "#/workflows/note/add";
import { listNotes } from "#/workflows/note/list";
import { removeNote } from "#/workflows/note/remove";
import { activatePaymentMethod } from "#/workflows/payment-method/activate";
import { createPaymentMethod } from "#/workflows/payment-method/create";
import { deactivatePaymentMethod } from "#/workflows/payment-method/deactivate";
import { deletePaymentMethod } from "#/workflows/payment-method/delete";
import { getPaymentMethod } from "#/workflows/payment-method/get";
import { listPaymentMethods } from "#/workflows/payment-method/list";
import { setPrimaryPaymentMethod } from "#/workflows/payment-method/primary/set";
import { updatePaymentMethod } from "#/workflows/payment-method/update";
import { activateUnitOfMeasure } from "#/workflows/unit-of-measure/activate";
import { createUnitOfMeasure } from "#/workflows/unit-of-measure/create";
import { deactivateUnitOfMeasure } from "#/workflows/unit-of-measure/deactivate";
import { deleteUnitOfMeasure } from "#/workflows/unit-of-measure/delete";
import { getUnitOfMeasure } from "#/workflows/unit-of-measure/get";
import { listUnitsOfMeasure } from "#/workflows/unit-of-measure/list";
import { updateUnitOfMeasure } from "#/workflows/unit-of-measure/update";

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

export const entities = {
  create: createEntity,
  delete: deleteEntity,
  get: getEntity,
  list: listEntities,
  setStatus: setEntityStatus,
  update: updateEntity,
} as const;

export const notes = {
  add: addNote,
  list: listNotes,
  remove: removeNote,
} as const;

export const paymentMethods = {
  activate: activatePaymentMethod,
  create: createPaymentMethod,
  deactivate: deactivatePaymentMethod,
  delete: deletePaymentMethod,
  get: getPaymentMethod,
  list: listPaymentMethods,
  setPrimary: setPrimaryPaymentMethod,
  update: updatePaymentMethod,
} as const;

export const unitsOfMeasure = {
  activate: activateUnitOfMeasure,
  create: createUnitOfMeasure,
  deactivate: deactivateUnitOfMeasure,
  delete: deleteUnitOfMeasure,
  get: getUnitOfMeasure,
  list: listUnitsOfMeasure,
  update: updateUnitOfMeasure,
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
