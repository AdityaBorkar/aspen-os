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
import { listPositionsByDepartment } from "#/workflows/config/department/positions/list";
import { setDepartmentHead } from "#/workflows/config/department/set-head";
import { getDepartmentSubtree } from "#/workflows/config/department/subtree";
import { getDepartmentTree } from "#/workflows/config/department/tree";
import { updateDepartment } from "#/workflows/config/department/update";
import { createDesignation } from "#/workflows/config/designation/create";
import { deleteDesignation } from "#/workflows/config/designation/delete";
import { getDesignationById } from "#/workflows/config/designation/get";
import { listDesignations } from "#/workflows/config/designation/list";
import { updateDesignation } from "#/workflows/config/designation/update";
import { createEmployeeGrade } from "#/workflows/config/employee-grade/create";
import { deleteEmployeeGrade } from "#/workflows/config/employee-grade/delete";
import { getEmployeeGradeById } from "#/workflows/config/employee-grade/get";
import { listEmployeeGrades } from "#/workflows/config/employee-grade/list";
import { updateEmployeeGrade } from "#/workflows/config/employee-grade/update";
import { createEmploymentType } from "#/workflows/config/employment-type/create";
import { deleteEmploymentType } from "#/workflows/config/employment-type/delete";
import { getEmploymentTypeById } from "#/workflows/config/employment-type/get";
import { listEmploymentTypes } from "#/workflows/config/employment-type/list";
import { updateEmploymentType } from "#/workflows/config/employment-type/update";
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
import { getOrganizationalChart } from "#/workflows/employee/organizational-chart/get";
import { listSkillMapByEmployee } from "#/workflows/employee/skill-map/by-employee/list";
import { getSkillMapById } from "#/workflows/employee/skill-map/by-id/get";
import { createSkillMap } from "#/workflows/employee/skill-map/create";
import { deleteSkillMap } from "#/workflows/employee/skill-map/delete";
import { updateSkillMap } from "#/workflows/employee/skill-map/update";
import { update as updateEmployee } from "#/workflows/employee/update";
import { getExitInterviewById } from "#/workflows/lifecycle/exit-interview/by-id/get";
import { completeExitInterview } from "#/workflows/lifecycle/exit-interview/complete";
import { createExitInterview } from "#/workflows/lifecycle/exit-interview/create";
import { deleteExitInterview } from "#/workflows/lifecycle/exit-interview/delete";
import { updateExitInterview } from "#/workflows/lifecycle/exit-interview/update";
import { listExitInterviews } from "#/workflows/lifecycle/exit-interviews/list";
import { listFullAndFinalStatements } from "#/workflows/lifecycle/full-and-final-statements/list";
import { approveFullAndFinal } from "#/workflows/lifecycle/full-and-final/approve";
import { getFullAndFinalById } from "#/workflows/lifecycle/full-and-final/by-id/get";
import { createFullAndFinal } from "#/workflows/lifecycle/full-and-final/create";
import { deleteFullAndFinal } from "#/workflows/lifecycle/full-and-final/delete";
import { markFullAndFinalPaid } from "#/workflows/lifecycle/full-and-final/mark-paid";
import { updateFullAndFinal } from "#/workflows/lifecycle/full-and-final/update";
import { getOnboardingTaskById } from "#/workflows/lifecycle/onboarding-task/by-id/get";
import { completeOnboardingTask } from "#/workflows/lifecycle/onboarding-task/complete";
import { createOnboardingTask } from "#/workflows/lifecycle/onboarding-task/create";
import { deleteOnboardingTask } from "#/workflows/lifecycle/onboarding-task/delete";
import { updateOnboardingTask } from "#/workflows/lifecycle/onboarding-task/update";
import { listOnboardingTasks } from "#/workflows/lifecycle/onboarding-tasks/list";
import { getOnboardingById } from "#/workflows/lifecycle/onboarding/by-id/get";
import { createOnboarding } from "#/workflows/lifecycle/onboarding/create";
import { deleteOnboarding } from "#/workflows/lifecycle/onboarding/delete";
import { updateOnboarding } from "#/workflows/lifecycle/onboarding/update";
import { listOnboardings } from "#/workflows/lifecycle/onboardings/list";
import { approvePromotion } from "#/workflows/lifecycle/promotion/approve";
import { getPromotionById } from "#/workflows/lifecycle/promotion/by-id/get";
import { completePromotion } from "#/workflows/lifecycle/promotion/complete";
import { createPromotion } from "#/workflows/lifecycle/promotion/create";
import { deletePromotion } from "#/workflows/lifecycle/promotion/delete";
import { rejectPromotion } from "#/workflows/lifecycle/promotion/reject";
import { updatePromotion } from "#/workflows/lifecycle/promotion/update";
import { listPromotions } from "#/workflows/lifecycle/promotions/list";
import { getSeparationTaskById } from "#/workflows/lifecycle/separation-task/by-id/get";
import { completeSeparationTask } from "#/workflows/lifecycle/separation-task/complete";
import { createSeparationTask } from "#/workflows/lifecycle/separation-task/create";
import { deleteSeparationTask } from "#/workflows/lifecycle/separation-task/delete";
import { updateSeparationTask } from "#/workflows/lifecycle/separation-task/update";
import { listSeparationTasks } from "#/workflows/lifecycle/separation-tasks/list";
import { getSeparationById } from "#/workflows/lifecycle/separation/by-id/get";
import { createSeparation } from "#/workflows/lifecycle/separation/create";
import { deleteSeparation } from "#/workflows/lifecycle/separation/delete";
import { updateSeparation } from "#/workflows/lifecycle/separation/update";
import { listSeparations } from "#/workflows/lifecycle/separations/list";
import { approveTransfer } from "#/workflows/lifecycle/transfer/approve";
import { getTransferById } from "#/workflows/lifecycle/transfer/by-id/get";
import { completeTransfer } from "#/workflows/lifecycle/transfer/complete";
import { createTransfer } from "#/workflows/lifecycle/transfer/create";
import { deleteTransfer } from "#/workflows/lifecycle/transfer/delete";
import { rejectTransfer } from "#/workflows/lifecycle/transfer/reject";
import { updateTransfer } from "#/workflows/lifecycle/transfer/update";
import { listTransfers } from "#/workflows/lifecycle/transfers/list";
import { assignEmployee } from "#/workflows/position/assignment/assign";
import { getEmployeePositionHistory } from "#/workflows/position/assignment/by-employee/history";
import { getPositionHistory } from "#/workflows/position/assignment/by-position/history";
import {
  getCurrentAssignment,
  getCurrentPositions,
} from "#/workflows/position/assignment/current/get";
import { transferAssignment } from "#/workflows/position/assignment/transfer";
import { unassignEmployee } from "#/workflows/position/assignment/unassign";
import { getDirectReports } from "#/workflows/position/direct-reports/get";
import { getOrgTree } from "#/workflows/position/org-tree/get";
import { getPeers } from "#/workflows/position/peers/get";
import { getPositionTree } from "#/workflows/position/position-tree/get";
import { activatePosition } from "#/workflows/position/position/activate";
import { getPositionById } from "#/workflows/position/position/by-id/get";
import { createPosition } from "#/workflows/position/position/create";
import { deactivatePosition } from "#/workflows/position/position/deactivate";
import { deletePosition } from "#/workflows/position/position/delete";
import { listPositions } from "#/workflows/position/position/list";
import { updatePosition } from "#/workflows/position/position/update";
import { getSubordinates } from "#/workflows/position/subordinates/get";
import { getTeam } from "#/workflows/position/team/get";

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

export const lifecycle = {
  exitInterviews: {
    complete: completeExitInterview,
    create: createExitInterview,
    get: getExitInterviewById,
    list: listExitInterviews,
    remove: deleteExitInterview,
    update: updateExitInterview,
  },
  fullAndFinal: {
    approve: approveFullAndFinal,
    create: createFullAndFinal,
    get: getFullAndFinalById,
    list: listFullAndFinalStatements,
    markPaid: markFullAndFinalPaid,
    remove: deleteFullAndFinal,
    update: updateFullAndFinal,
  },
  onboardingTasks: {
    complete: completeOnboardingTask,
    create: createOnboardingTask,
    get: getOnboardingTaskById,
    list: listOnboardingTasks,
    remove: deleteOnboardingTask,
    update: updateOnboardingTask,
  },
  onboardings: {
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
  separationTasks: {
    complete: completeSeparationTask,
    create: createSeparationTask,
    get: getSeparationTaskById,
    list: listSeparationTasks,
    remove: deleteSeparationTask,
    update: updateSeparationTask,
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

export const position = {
  assignments: {
    assign: assignEmployee,
    getCurrent: getCurrentAssignment,
    listCurrent: getCurrentPositions,
    listHistoryByEmployee: getEmployeePositionHistory,
    listHistoryByPosition: getPositionHistory,
    transfer: transferAssignment,
    unassign: unassignEmployee,
  },
  org: {
    getDirectReports,
    getPeers,
    getPositionTree,
    getSubordinates,
    getTeam,
    getTree: getOrgTree,
  },
  positions: {
    activate: activatePosition,
    create: createPosition,
    deactivate: deactivatePosition,
    get: getPositionById,
    list: listPositions,
    remove: deletePosition,
    update: updatePosition,
  },
} as const;

export const config = {
  departments: {
    create: createDepartment,
    get: getDepartmentById,
    list: listDepartments,
    listPositions: listPositionsByDepartment,
    move: moveDepartment,
    remove: deleteDepartment,
    setHead: setDepartmentHead,
    subtree: getDepartmentSubtree,
    tree: getDepartmentTree,
    update: updateDepartment,
  },
  designations: {
    create: createDesignation,
    get: getDesignationById,
    list: listDesignations,
    remove: deleteDesignation,
    update: updateDesignation,
  },
  employeeGrades: {
    create: createEmployeeGrade,
    get: getEmployeeGradeById,
    list: listEmployeeGrades,
    remove: deleteEmployeeGrade,
    update: updateEmployeeGrade,
  },
  employmentTypes: {
    create: createEmploymentType,
    get: getEmploymentTypeById,
    list: listEmploymentTypes,
    remove: deleteEmploymentType,
    update: updateEmploymentType,
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
