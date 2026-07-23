import type {
  DatabaseUnit,
  ModuleInfra,
  PubSubUnit,
} from "@aspen-os/framework/server";

import * as dbSchema from "./db-schema";
import {
  ACCESS_EVENTS,
  ATTENDANCE_EVENTS,
  EMPLOYEE_EVENTS,
  LEAVE_EVENTS,
  LIFECYCLE_EVENTS,
  OVERTIME_EVENTS,
  SETUP_EVENTS,
  SHIFT_EVENTS,
} from "./event-map";
import { AccessWorkflow } from "./workflows/access";
import { AttendanceWorkflow } from "./workflows/attendance";
import { EmployeeWorkflow } from "./workflows/employee";
import { LeaveWorkflow } from "./workflows/leave";
import { LifecycleWorkflow } from "./workflows/lifecycle";
import { OvertimeWorkflow } from "./workflows/overtime";
import { SetupWorkflow } from "./workflows/setup";
import { ShiftWorkflow } from "./workflows/shift";

export type {
  AccessLevel,
  HrPermissionModule,
  PermissionAction,
} from "./constants";
export type {
  HrPermission,
  HrRole,
  HrRolePermission,
  HrUser,
  HrUserBranchAccess,
  HrUserRole,
  NewHrPermission,
  NewHrRole,
  NewHrRolePermission,
  NewHrUser,
  NewHrUserBranchAccess,
  NewHrUserRole,
} from "./db-schema";
export type { HrEventMap } from "./event-map";
export {
  ACCESS_EVENTS,
  ATTENDANCE_EVENTS,
  EMPLOYEE_EVENTS,
  LEAVE_EVENTS,
  LIFECYCLE_EVENTS,
  OVERTIME_EVENTS,
  SETUP_EVENTS,
  SHIFT_EVENTS,
} from "./event-map";
export * from "./types";
export { dbSchema as db_schema };

export type HrModuleConfig = {
  country: "INDIA";
};

export class HrModule {
  static create(config: HrModuleConfig): HrModule {
    return new HrModule(config);
  }

  // biome-ignore lint/complexity/noUselessConstructor: used by static create()
  constructor(_config: HrModuleConfig) {}

  readonly db_schema = dbSchema;
  readonly $name = "hr";
  readonly $dependencies: readonly string[] = [];

  #access: AccessWorkflow | null = null;
  #attendance: AttendanceWorkflow | null = null;
  #employee: EmployeeWorkflow | null = null;
  #leave: LeaveWorkflow | null = null;
  #lifecycle: LifecycleWorkflow | null = null;
  #overtime: OvertimeWorkflow | null = null;
  #setup: SetupWorkflow | null = null;
  #shift: ShiftWorkflow | null = null;

  get access(): AccessWorkflow {
    if (!this.#access) throw notInitialized();
    return this.#access;
  }

  get attendance(): AttendanceWorkflow {
    if (!this.#attendance) throw notInitialized();
    return this.#attendance;
  }

  get employee(): EmployeeWorkflow {
    if (!this.#employee) throw notInitialized();
    return this.#employee;
  }

  get leave(): LeaveWorkflow {
    if (!this.#leave) throw notInitialized();
    return this.#leave;
  }

  get lifecycle(): LifecycleWorkflow {
    if (!this.#lifecycle) throw notInitialized();
    return this.#lifecycle;
  }

  get overtime(): OvertimeWorkflow {
    if (!this.#overtime) throw notInitialized();
    return this.#overtime;
  }

  get setup(): SetupWorkflow {
    if (!this.#setup) throw notInitialized();
    return this.#setup;
  }

  get shift(): ShiftWorkflow {
    if (!this.#shift) throw notInitialized();
    return this.#shift;
  }

  $initialize(units: { db: DatabaseUnit; pubsub: PubSubUnit }): void {
    this.#access = new AccessWorkflow(units.db.db);
    this.#attendance = new AttendanceWorkflow(units.db.db);
    this.#employee = new EmployeeWorkflow(units.db.db);
    this.#leave = new LeaveWorkflow(units.db.db);
    this.#lifecycle = new LifecycleWorkflow(units.db.db);
    this.#overtime = new OvertimeWorkflow(units.db.db);
    this.#setup = new SetupWorkflow(units.db.db);
    this.#shift = new ShiftWorkflow(units.db.db);
  }

  $prepareInfra(): ModuleInfra {
    return {
      auth: { acl: {} },
      db: { schemas: dbSchema.hrTables },
      events: {
        access: ACCESS_EVENTS,
        attendance: ATTENDANCE_EVENTS,
        employee: EMPLOYEE_EVENTS,
        leave: LEAVE_EVENTS,
        lifecycle: LIFECYCLE_EVENTS,
        overtime: OVERTIME_EVENTS,
        setup: SETUP_EVENTS,
        shift: SHIFT_EVENTS,
      },
    };
  }

  async $cleanup(): Promise<void> {
    this.#access = null;
    this.#attendance = null;
    this.#employee = null;
    this.#leave = null;
    this.#lifecycle = null;
    this.#overtime = null;
    this.#setup = null;
    this.#shift = null;
  }
}

function notInitialized(): Error {
  return new Error(
    "HR module not initialized. Call $initialize() after Framework.create().",
  );
}
