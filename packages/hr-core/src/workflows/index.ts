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
import { archiveAnnouncement } from "#/workflows/announcement/archive";
import { getAnnouncementById } from "#/workflows/announcement/by-id/get";
import { cancelScheduleAnnouncement } from "#/workflows/announcement/cancel-schedule";
import { createAnnouncement } from "#/workflows/announcement/create";
import { deleteAnnouncement } from "#/workflows/announcement/delete";
import { pinAnnouncement } from "#/workflows/announcement/pin";
import { publishAnnouncement } from "#/workflows/announcement/publish";
import { listRecipients } from "#/workflows/announcement/recipients/list";
import { restoreAnnouncement } from "#/workflows/announcement/restore";
import { scheduleAnnouncement } from "#/workflows/announcement/schedule";
import { getAnnouncementStats } from "#/workflows/announcement/stats/get";
import { unpinAnnouncement } from "#/workflows/announcement/unpin";
import { updateAnnouncement } from "#/workflows/announcement/update";
import { listAnnouncements } from "#/workflows/announcements/list";
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
import { listHealthInsuranceByEmployee } from "#/workflows/employee/health-insurance/by-employee/list";
import { getHealthInsuranceById } from "#/workflows/employee/health-insurance/by-id/get";
import { createHealthInsurance } from "#/workflows/employee/health-insurance/create";
import { deleteHealthInsurance } from "#/workflows/employee/health-insurance/delete";
import { updateHealthInsurance } from "#/workflows/employee/health-insurance/update";
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
import { getDepartmentById } from "#/workflows/setup/department/by-id/get";
import { createDepartment } from "#/workflows/setup/department/create";
import { deleteDepartment } from "#/workflows/setup/department/delete";
import { moveDepartment } from "#/workflows/setup/department/move";
import { setDepartmentHead } from "#/workflows/setup/department/set-head";
import { updateDepartment } from "#/workflows/setup/department/update";
import { listDepartments } from "#/workflows/setup/departments/list";
import { listPositionsByDepartment } from "#/workflows/setup/departments/positions-by-department/list";
import { getDepartmentSubtree } from "#/workflows/setup/departments/subtree";
import { getDepartmentTree } from "#/workflows/setup/departments/tree";
import { getDesignationById } from "#/workflows/setup/designation/by-id/get";
import { createDesignation } from "#/workflows/setup/designation/create";
import { deleteDesignation } from "#/workflows/setup/designation/delete";
import { updateDesignation } from "#/workflows/setup/designation/update";
import { listDesignations } from "#/workflows/setup/designations/list";
import { getEmployeeGradeById } from "#/workflows/setup/employee-grade/by-id/get";
import { createEmployeeGrade } from "#/workflows/setup/employee-grade/create";
import { deleteEmployeeGrade } from "#/workflows/setup/employee-grade/delete";
import { updateEmployeeGrade } from "#/workflows/setup/employee-grade/update";
import { listEmployeeGrades } from "#/workflows/setup/employee-grades/list";
import { getEmploymentTypeById } from "#/workflows/setup/employment-type/by-id/get";
import { createEmploymentType } from "#/workflows/setup/employment-type/create";
import { deleteEmploymentType } from "#/workflows/setup/employment-type/delete";
import { updateEmploymentType } from "#/workflows/setup/employment-type/update";
import { listEmploymentTypes } from "#/workflows/setup/employment-types/list";
import { getHolidayListById } from "#/workflows/setup/holiday-list/by-id/get";
import { createHolidayList } from "#/workflows/setup/holiday-list/create";
import { deleteHolidayList } from "#/workflows/setup/holiday-list/delete";
import { updateHolidayList } from "#/workflows/setup/holiday-list/update";
import { listHolidayLists } from "#/workflows/setup/holiday-lists/list";
import { getHolidayById } from "#/workflows/setup/holiday/by-id/get";
import { createHoliday } from "#/workflows/setup/holiday/create";
import { deleteHoliday } from "#/workflows/setup/holiday/delete";
import { updateHoliday } from "#/workflows/setup/holiday/update";
import { listHolidaysByList } from "#/workflows/setup/holidays/by-list/list";
import { getHrSettings } from "#/workflows/setup/hr-settings/get";
import { updateHrSettings } from "#/workflows/setup/hr-settings/update";
import { getPayrollSettings } from "#/workflows/setup/payroll-settings/get";
import { updatePayrollSettings } from "#/workflows/setup/payroll-settings/update";

export const access = {
  assignPermissionToRole,
  assignRoleToUser,
  createPermission,
  createRole,
  createUser,
  deletePermission,
  deleteRole,
  deleteUser,
  getAccessibleBranches,
  getPermissionById,
  getRoleById,
  getRoleByName,
  getRolePermissions,
  getUserBranches,
  getUserByEmployeeId,
  getUserById,
  getUserByUserId,
  getUserPermissions,
  getUserRoles,
  getUserRolesForBranch,
  grantBranchAccess,
  hasBranchAccess,
  hasPermission,
  listPermissions,
  listPermissionsByModule,
  listRoles,
  listUsers,
  removePermissionFromRole,
  removeRoleFromUser,
  revokeBranchAccess,
  updateBranchAccess,
  updateRole,
  updateUser,
} as const;

export const announcement = {
  archive: archiveAnnouncement,
  cancelSchedule: cancelScheduleAnnouncement,
  create: createAnnouncement,
  delete: deleteAnnouncement,
  getById: getAnnouncementById,
  getStats: getAnnouncementStats,
  list: listAnnouncements,
  listRecipients,
  pin: pinAnnouncement,
  publish: publishAnnouncement,
  restore: restoreAnnouncement,
  schedule: scheduleAnnouncement,
  unpin: unpinAnnouncement,
  update: updateAnnouncement,
} as const;

export const employee = {
  activate,
  addGroupMember,
  create: createEmployee,
  createGroup,
  createHealthInsurance,
  createSkillMap,
  deactivate,
  deleteGroup,
  deleteHealthInsurance,
  deleteSkillMap,
  getByEmployeeId,
  getById: getEmployeeById,
  getGroupById,
  getHealthInsuranceById,
  getOrganizationalChart,
  getSkillMapById,
  list: listEmployees,
  listGroupMembers,
  listGroups,
  listHealthInsuranceByEmployee,
  listSkillMapByEmployee,
  markAsLeft,
  removeGroupMember,
  update: updateEmployee,
  updateGroup,
  updateHealthInsurance,
  updateSkillMap,
} as const;

export const lifecycle = {
  approveFullAndFinal,
  approvePromotion,
  approveTransfer,
  completeExitInterview,
  completeOnboardingTask,
  completePromotion,
  completeSeparationTask,
  completeTransfer,
  createExitInterview,
  createFullAndFinal,
  createOnboarding,
  createOnboardingTask,
  createPromotion,
  createSeparation,
  createSeparationTask,
  createTransfer,
  deleteExitInterview,
  deleteFullAndFinal,
  deleteOnboarding,
  deleteOnboardingTask,
  deletePromotion,
  deleteSeparation,
  deleteSeparationTask,
  deleteTransfer,
  getExitInterviewById,
  getFullAndFinalById,
  getOnboardingById,
  getOnboardingTaskById,
  getPromotionById,
  getSeparationById,
  getSeparationTaskById,
  getTransferById,
  listExitInterviews,
  listFullAndFinalStatements,
  listOnboardingTasks,
  listOnboardings,
  listPromotions,
  listSeparationTasks,
  listSeparations,
  listTransfers,
  markFullAndFinalPaid,
  rejectPromotion,
  rejectTransfer,
  updateExitInterview,
  updateFullAndFinal,
  updateOnboarding,
  updateOnboardingTask,
  updatePromotion,
  updateSeparation,
  updateSeparationTask,
  updateTransfer,
} as const;

export const position = {
  activate: activatePosition,
  assignEmployee,
  create: createPosition,
  deactivate: deactivatePosition,
  delete: deletePosition,
  getById: getPositionById,
  getCurrentAssignment,
  getCurrentPositions,
  getDirectReports,
  getEmployeePositionHistory,
  getOrgTree,
  getPeers,
  getPositionHistory,
  getPositionTree,
  getSubordinates,
  getTeam,
  list: listPositions,
  transferAssignment,
  unassignEmployee,
  update: updatePosition,
} as const;

export const setup = {
  createDepartment,
  createDesignation,
  createEmployeeGrade,
  createEmploymentType,
  createHoliday,
  createHolidayList,
  deleteDepartment,
  deleteDesignation,
  deleteEmployeeGrade,
  deleteEmploymentType,
  deleteHoliday,
  deleteHolidayList,
  getDepartmentById,
  getDepartmentSubtree,
  getDepartmentTree,
  getDesignationById,
  getEmployeeGradeById,
  getEmploymentTypeById,
  getHolidayById,
  getHolidayListById,
  getHrSettings,
  getPayrollSettings,
  listDepartments,
  listDesignations,
  listEmployeeGrades,
  listEmploymentTypes,
  listHolidayLists,
  listHolidaysByList,
  listPositionsByDepartment,
  moveDepartment,
  setDepartmentHead,
  updateDepartment,
  updateDesignation,
  updateEmployeeGrade,
  updateEmploymentType,
  updateHoliday,
  updateHolidayList,
  updateHrSettings,
  updatePayrollSettings,
} as const;
