import { getAccessibleBranches } from "#/workflows/access/accessible-branches/get";
import { grantBranchAccess } from "#/workflows/access/branch-access/grant";
import { revokeBranchAccess } from "#/workflows/access/branch-access/revoke";
import { updateBranchAccess } from "#/workflows/access/branch-access/update";
import { hasBranchAccess } from "#/workflows/access/has-branch-access";
import { hasPermission } from "#/workflows/access/has-permission";
import { getPermissionById } from "#/workflows/access/permission/by-id/get";
import { createPermission } from "#/workflows/access/permission/create";
import { deletePermission } from "#/workflows/access/permission/delete";
import { listPermissionsByModule } from "#/workflows/access/permissions/by-module/list";
import { listPermissions } from "#/workflows/access/permissions/list";
import { getRolePermissions } from "#/workflows/access/role-permissions/get";
import { getRoleById } from "#/workflows/access/role/by-id/get";
import { getRoleByName } from "#/workflows/access/role/by-name/get";
import { createRole } from "#/workflows/access/role/create";
import { deleteRole } from "#/workflows/access/role/delete";
import { assignPermissionToRole } from "#/workflows/access/role/permission/assign";
import { removePermissionFromRole } from "#/workflows/access/role/permission/remove";
import { updateRole } from "#/workflows/access/role/update";
import { listRoles } from "#/workflows/access/roles/list";
import { getUserBranches } from "#/workflows/access/user-branches/get";
import { getUserPermissions } from "#/workflows/access/user-permissions/get";
import { getUserRolesForBranch } from "#/workflows/access/user-roles-for-branch/get";
import { getUserRoles } from "#/workflows/access/user-roles/get";
import { getUserByEmployeeId } from "#/workflows/access/user/by-employee-id/get";
import { getUserById } from "#/workflows/access/user/by-id/get";
import { getUserByUserId } from "#/workflows/access/user/by-user-id/get";
import { createUser } from "#/workflows/access/user/create";
import { deleteUser } from "#/workflows/access/user/delete";
import { assignRoleToUser } from "#/workflows/access/user/role/assign";
import { removeRoleFromUser } from "#/workflows/access/user/role/remove";
import { updateUser } from "#/workflows/access/user/update";
import { listUsers } from "#/workflows/access/users/list";
import { createDepartment } from "#/workflows/config/department/create";
import { deleteDepartment } from "#/workflows/config/department/delete";
import { getDepartmentById } from "#/workflows/config/department/get";
import { listDepartments } from "#/workflows/config/department/list";
import { moveDepartment } from "#/workflows/config/department/move";
import { setDepartmentHead } from "#/workflows/config/department/set-head";
import { getDepartmentSubtree } from "#/workflows/config/department/subtree";
import { getDepartmentTree } from "#/workflows/config/department/tree";
import { updateDepartment } from "#/workflows/config/department/update";
import { getHrSettings } from "#/workflows/config/hr/get";
import { updateHrSettings } from "#/workflows/config/hr/update";
import { getPayrollSettings } from "#/workflows/config/payroll/get";
import { updatePayrollSettings } from "#/workflows/config/payroll/update";
import { activate } from "#/workflows/employee/activate";
import { markAsLeft } from "#/workflows/employee/as-left/mark";
import { getByEmployeeId } from "#/workflows/employee/by-employee-id/get";
import { getById as getEmployeeById } from "#/workflows/employee/by-id/get";
import { create as createEmployee } from "#/workflows/employee/create";
import { deactivate } from "#/workflows/employee/deactivate";
import { addGroupMember } from "#/workflows/employee/group-member/add";
import { removeGroupMember } from "#/workflows/employee/group-member/remove";
import { listGroupMembers } from "#/workflows/employee/group-members/list";
import { getGroupById } from "#/workflows/employee/group/by-id/get";
import { createGroup } from "#/workflows/employee/group/create";
import { deleteGroup } from "#/workflows/employee/group/delete";
import { updateGroup } from "#/workflows/employee/group/update";
import { listGroups } from "#/workflows/employee/groups/list";
import { list as listEmployees } from "#/workflows/employee/list";
import { onboard } from "#/workflows/employee/onboard";
import { getOrganizationalChart } from "#/workflows/employee/organizational-chart/get";
import { listSkillMapByEmployee } from "#/workflows/employee/skill-map/by-employee/list";
import { getSkillMapById } from "#/workflows/employee/skill-map/by-id/get";
import { createSkillMap } from "#/workflows/employee/skill-map/create";
import { deleteSkillMap } from "#/workflows/employee/skill-map/delete";
import { updateSkillMap } from "#/workflows/employee/skill-map/update";
import { update as updateEmployee } from "#/workflows/employee/update";
import { exportPayroll } from "#/workflows/payroll/export";
import { getOnboardingById } from "#/workflows/transition/onboarding/by-id/get";
import { completeOnboarding } from "#/workflows/transition/onboarding/complete";
import { createOnboarding } from "#/workflows/transition/onboarding/create";
import { deleteOnboarding } from "#/workflows/transition/onboarding/remove";
import { updateOnboarding } from "#/workflows/transition/onboarding/update";
import { listOnboardings } from "#/workflows/transition/onboardings/list";
import { approvePromotion } from "#/workflows/transition/promotion/approve";
import { getPromotionById } from "#/workflows/transition/promotion/by-id/get";
import { completePromotion } from "#/workflows/transition/promotion/complete";
import { createPromotion } from "#/workflows/transition/promotion/create";
import { deletePromotion } from "#/workflows/transition/promotion/delete";
import { rejectPromotion } from "#/workflows/transition/promotion/reject";
import { updatePromotion } from "#/workflows/transition/promotion/update";
import { listPromotions } from "#/workflows/transition/promotions/list";
import { getSeparationById } from "#/workflows/transition/separation/by-id/get";
import { createSeparation } from "#/workflows/transition/separation/create";
import { deleteSeparation } from "#/workflows/transition/separation/delete";
import { updateSeparation } from "#/workflows/transition/separation/update";
import { listSeparations } from "#/workflows/transition/separations/list";
import { approveTransfer } from "#/workflows/transition/transfer/approve";
import { getTransferById } from "#/workflows/transition/transfer/by-id/get";
import { completeTransfer } from "#/workflows/transition/transfer/complete";
import { createTransfer } from "#/workflows/transition/transfer/create";
import { deleteTransfer } from "#/workflows/transition/transfer/delete";
import { rejectTransfer } from "#/workflows/transition/transfer/reject";
import { updateTransfer } from "#/workflows/transition/transfer/update";
import { listTransfers } from "#/workflows/transition/transfers/list";

export const access = {
  branches: {
    grant: grantBranchAccess,
    hasAccess: hasBranchAccess,
    hasPermission,
    listAccessible: getAccessibleBranches,
    revoke: revokeBranchAccess,
    update: updateBranchAccess,
  },
  permissions: {
    create: createPermission,
    get: getPermissionById,
    list: listPermissions,
    listByModule: listPermissionsByModule,
    remove: deletePermission,
  },
  roles: {
    assignPermission: assignPermissionToRole,
    create: createRole,
    get: getRoleById,
    getByName: getRoleByName,
    list: listRoles,
    listPermissions: getRolePermissions,
    remove: deleteRole,
    removePermission: removePermissionFromRole,
    update: updateRole,
  },
  users: {
    assignRole: assignRoleToUser,
    create: createUser,
    get: getUserById,
    getByEmployeeId: getUserByEmployeeId,
    getByUserId: getUserByUserId,
    list: listUsers,
    listBranches: getUserBranches,
    listPermissions: getUserPermissions,
    listRoles: getUserRoles,
    listRolesForBranch: getUserRolesForBranch,
    remove: deleteUser,
    removeRole: removeRoleFromUser,
    update: updateUser,
  },
} as const;

export const employee = {
  employees: {
    activate,
    create: createEmployee,
    deactivate,
    get: getEmployeeById,
    getByEmployeeId,
    getOrgChart: getOrganizationalChart,
    list: listEmployees,
    markAsLeft,
    onboard,
    update: updateEmployee,
  },
  groups: {
    addMember: addGroupMember,
    create: createGroup,
    get: getGroupById,
    list: listGroups,
    listMembers: listGroupMembers,
    remove: deleteGroup,
    removeMember: removeGroupMember,
    update: updateGroup,
  },
  skillMaps: {
    create: createSkillMap,
    get: getSkillMapById,
    listByEmployee: listSkillMapByEmployee,
    remove: deleteSkillMap,
    update: updateSkillMap,
  },
} as const;

export const transition = {
  onboardings: {
    complete: completeOnboarding,
    create: createOnboarding,
    get: getOnboardingById,
    list: listOnboardings,
    remove: deleteOnboarding,
    update: updateOnboarding,
  },
  promotions: {
    approve: approvePromotion,
    complete: completePromotion,
    create: createPromotion,
    get: getPromotionById,
    list: listPromotions,
    reject: rejectPromotion,
    remove: deletePromotion,
    update: updatePromotion,
  },
  separations: {
    create: createSeparation,
    get: getSeparationById,
    list: listSeparations,
    remove: deleteSeparation,
    update: updateSeparation,
  },
  transfers: {
    approve: approveTransfer,
    complete: completeTransfer,
    create: createTransfer,
    get: getTransferById,
    list: listTransfers,
    reject: rejectTransfer,
    remove: deleteTransfer,
    update: updateTransfer,
  },
} as const;

export const config = {
  departments: {
    create: createDepartment,
    get: getDepartmentById,
    list: listDepartments,
    move: moveDepartment,
    remove: deleteDepartment,
    setHead: setDepartmentHead,
    subtree: getDepartmentSubtree,
    tree: getDepartmentTree,
    update: updateDepartment,
  },
  hr: {
    get: getHrSettings,
    update: updateHrSettings,
  },
  payroll: {
    get: getPayrollSettings,
    update: updatePayrollSettings,
  },
} as const;

export const payroll = {
  export: exportPayroll,
} as const;
