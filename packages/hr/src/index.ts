import type { DatabaseUnit, PubSubUnit } from "@aspen-os/framework/server";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import * as dbSchema from "./db-schema";
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

  constructor(private config: HrModuleConfig) {}

  readonly db_schema = dbSchema;
  readonly $name = "hr";

  #access: AccessWorkflow | null = null;
  #attendance: AttendanceWorkflow | null = null;
  #employee: EmployeeWorkflow | null = null;
  #leave: LeaveWorkflow | null = null;
  #lifecycle: LifecycleWorkflow | null = null;
  #overtime: OvertimeWorkflow | null = null;
  #setup: SetupWorkflow | null = null;
  #shift: ShiftWorkflow | null = null;
  #db: NodePgDatabase | null = null;

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
    this.#db = units.db.db;
    this.#access = new AccessWorkflow(units.db.db);
    this.#attendance = new AttendanceWorkflow(units.db.db);
    this.#employee = new EmployeeWorkflow(units.db.db);
    this.#leave = new LeaveWorkflow(units.db.db);
    this.#lifecycle = new LifecycleWorkflow(units.db.db);
    this.#overtime = new OvertimeWorkflow(units.db.db);
    this.#setup = new SetupWorkflow(units.db.db);
    this.#shift = new ShiftWorkflow(units.db.db);
  }

  async $prepare(): Promise<void> {
    if (!this.#db) throw notInitialized();

    const { pushSchema } = await import("drizzle-kit/api");
    const result = await pushSchema(dbSchema.hrTables, this.#db);
    if (result.statementsToExecute.length > 0) {
      console.log(
        `[hr] Applying schema for ${this.config.country}: ${result.statementsToExecute.length} statements`,
      );
      if (result.hasDataLoss) {
        console.warn(
          "[hr] Schema push has data loss warnings:",
          result.warnings,
        );
      }
      await result.apply();
      console.log("[hr] Schema applied");
    }
  }

  async $destroy(): Promise<void> {
    this.#access = null;
    this.#attendance = null;
    this.#employee = null;
    this.#leave = null;
    this.#lifecycle = null;
    this.#overtime = null;
    this.#setup = null;
    this.#shift = null;
    this.#db = null;
  }
}

function notInitialized(): Error {
  return new Error(
    "HR module not initialized. Call $initialize() after Framework.create().",
  );
}
