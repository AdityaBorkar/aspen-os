import { createAddress } from "#/workflows/address/create";
import { deleteAddress } from "#/workflows/address/delete";
import { getAddress } from "#/workflows/address/get";
import { listAddresses } from "#/workflows/address/list";
import { updateAddress } from "#/workflows/address/update";
import { checkConnection } from "#/workflows/connection/check";
import { deleteConnection } from "#/workflows/connection/delete";
import { getConnection } from "#/workflows/connection/get";
import { listConnections } from "#/workflows/connection/list";
import { updateConnection } from "#/workflows/connection/update";
import { createContact } from "#/workflows/contact/create";
import { deleteContact } from "#/workflows/contact/delete";
import { getContact } from "#/workflows/contact/get";
import { listContacts } from "#/workflows/contact/list";
import { removeContact } from "#/workflows/contact/remove";
import { updateContact } from "#/workflows/contact/update";
import { createEntity } from "#/workflows/entity/create";
import { deleteEntity } from "#/workflows/entity/delete";
import { getEntity } from "#/workflows/entity/get";
import { listEntities } from "#/workflows/entity/list";
import { updateEntity } from "#/workflows/entity/update";
import { createFilterView } from "#/workflows/filter-view/create";
import { getDefaultFilterView } from "#/workflows/filter-view/default/get";
import { setDefaultFilterView } from "#/workflows/filter-view/default/set";
import { deleteFilterView } from "#/workflows/filter-view/delete";
import { duplicateFilterView } from "#/workflows/filter-view/duplicate";
import { getFilterView } from "#/workflows/filter-view/get";
import { listFilterViews } from "#/workflows/filter-view/list";
import { updateFilterView } from "#/workflows/filter-view/update";
import { createOrgBranch } from "#/workflows/org-branch/create";
import { getOrgBranch } from "#/workflows/org-branch/get";
import { listOrgBranches } from "#/workflows/org-branch/list";
import { getOrgBranchTree } from "#/workflows/org-branch/tree";
import { updateOrgBranch } from "#/workflows/org-branch/update";
import { activatePaymentMethod } from "#/workflows/payment-method/activate";
import { createPaymentMethod } from "#/workflows/payment-method/create";
import { deactivatePaymentMethod } from "#/workflows/payment-method/deactivate";
import { deletePaymentMethod } from "#/workflows/payment-method/delete";
import { getPaymentMethod } from "#/workflows/payment-method/get";
import { listPaymentMethods } from "#/workflows/payment-method/list";
import { setPrimaryPaymentMethod } from "#/workflows/payment-method/primary/set";
import { updatePaymentMethod } from "#/workflows/payment-method/update";
import { getSetting } from "#/workflows/settings/get";
import { setSetting } from "#/workflows/settings/set";
import { createUnitOfMeasure } from "#/workflows/unit-of-measure/create";
import { deleteUnitOfMeasure } from "#/workflows/unit-of-measure/delete";
import { getUnitOfMeasure } from "#/workflows/unit-of-measure/get";
import { listUnitsOfMeasure } from "#/workflows/unit-of-measure/list";
import { updateUnitOfMeasure } from "#/workflows/unit-of-measure/update";

export const addresses = {
  create: createAddress,
  delete: deleteAddress,
  get: getAddress,
  list: listAddresses,
  update: updateAddress,
} as const;

export const contacts = {
  create: createContact,
  delete: deleteContact,
  get: getContact,
  list: listContacts,
  remove: removeContact,
  update: updateContact,
} as const;

export const entities = {
  create: createEntity,
  delete: deleteEntity,
  get: getEntity,
  list: listEntities,
  update: updateEntity,
} as const;

export const filterViews = {
  create: createFilterView,
  delete: deleteFilterView,
  duplicate: duplicateFilterView,
  get: getFilterView,
  getDefault: getDefaultFilterView,
  list: listFilterViews,
  setDefault: setDefaultFilterView,
  update: updateFilterView,
} as const;

export const orgBranches = {
  create: createOrgBranch,
  get: getOrgBranch,
  list: listOrgBranches,
  tree: getOrgBranchTree,
  update: updateOrgBranch,
} as const;

// Deprecated alias — prefer orgBranches.
export const branches = orgBranches;

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

export const settings = {
  get: getSetting,
  set: setSetting,
} as const;

export const unitsOfMeasure = {
  create: createUnitOfMeasure,
  delete: deleteUnitOfMeasure,
  get: getUnitOfMeasure,
  list: listUnitsOfMeasure,
  update: updateUnitOfMeasure,
} as const;

export const connectionActions = {
  check: checkConnection,
  delete: deleteConnection,
  get: getConnection,
  list: listConnections,
  update: updateConnection,
} as const;
