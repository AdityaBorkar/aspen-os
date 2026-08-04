import type { PubSubUnit } from "@aspen-os/platform/server";

import type { CreateComplianceDocumentInput } from "../types";
import { createDocument, type DocumentDeps } from "../workflows/document";
import { createObligation, type ObligationDeps } from "../workflows/obligation";

interface EmployeeOnboardedEvent {
  employeeId: string;
  employeeName: string;
}

interface EmployeeSeparatedEvent {
  employeeId: string;
  employeeName: string;
}

interface VehicleRegisteredEvent {
  vehicleId: string;
  vehicleRegistration: string;
}

interface BranchCreatedEvent {
  branch: {
    code: string;
    id: string;
    name: string;
    type: string;
  };
}

interface FinancialYearStartedEvent {
  financialYear: string;
}

interface ConnectionCreatedEvent {
  connection: {
    id: string;
    name: string;
    type: string;
  };
}

export interface EventBridgeDeps {
  documentDeps: DocumentDeps;
  obligationDeps: ObligationDeps;
  pubsub: PubSubUnit;
}

export async function registerEventBridgeSubscriptions(
  deps: EventBridgeDeps,
): Promise<string[]> {
  const topics: string[] = [];

  await subscribeSafe(deps, "hr:employee_onboarded", async (data: unknown) => {
    const event = data as EmployeeOnboardedEvent;
    await handleEmployeeOnboarded(event, deps);
  });
  topics.push("hr:employee_onboarded");

  await subscribeSafe(deps, "hr:employee_separated", async (data: unknown) => {
    const event = data as EmployeeSeparatedEvent;
    await handleEmployeeSeparated(event, deps);
  });
  topics.push("hr:employee_separated");

  await subscribeSafe(
    deps,
    "fleet:vehicle_registered",
    async (data: unknown) => {
      const event = data as VehicleRegisteredEvent;
      await handleVehicleRegistered(event, deps);
    },
  );
  topics.push("fleet:vehicle_registered");

  await subscribeSafe(
    deps,
    "organization:branch_created",
    async (data: unknown) => {
      const event = data as BranchCreatedEvent;
      await handleBranchCreated(event, deps);
    },
  );
  topics.push("organization:branch_created");

  await subscribeSafe(
    deps,
    "accounting:financial_year_started",
    async (data: unknown) => {
      const event = data as FinancialYearStartedEvent;
      await handleFinancialYearStarted(event, deps);
    },
  );
  topics.push("accounting:financial_year_started");

  await subscribeSafe(
    deps,
    "organization:connection_created",
    async (data: unknown) => {
      const event = data as ConnectionCreatedEvent;
      await handleConnectionCreated(event, deps);
    },
  );
  topics.push("organization:connection_created");

  return topics;
}

export async function unregisterEventBridge(
  topics: string[],
  { pubsub }: Pick<EventBridgeDeps, "pubsub">,
): Promise<void> {
  for (const topic of topics) {
    try {
      await pubsub.unsubscribe(topic);
    } catch {
      // ignore
    }
  }
}

async function subscribeSafe(
  deps: EventBridgeDeps,
  topic: string,
  handler: (data: unknown) => Promise<void>,
): Promise<void> {
  try {
    await deps.pubsub.subscribe(topic, async (message) => {
      await handler(message.data);
    });
  } catch {
    // Source module not installed — silently no-op
  }
}

async function handleEmployeeOnboarded(
  event: EmployeeOnboardedEvent,
  deps: EventBridgeDeps,
): Promise<void> {
  const docs: CreateComplianceDocumentInput[] = [
    {
      category: "hr",
      createdBy: "system",
      documentType: "background_check",
      expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      metadata: {
        checkType: "criminal",
        employeeId: event.employeeId,
      },
      name: `Background Check — ${event.employeeName}`,
      reminderDays: [30, 7],
      sourceEntityId: event.employeeId,
      sourceEntityType: "employee",
      sourceModule: "hr",
    },
    {
      category: "hr",
      createdBy: "system",
      documentType: "id_verification",
      metadata: {
        checkType: "identity",
        employeeId: event.employeeId,
      },
      name: `ID Verification — ${event.employeeName}`,
      sourceEntityId: event.employeeId,
      sourceEntityType: "employee",
      sourceModule: "hr",
    },
  ];

  for (const doc of docs) {
    await createDocument(doc, deps.documentDeps);
  }
}

async function handleEmployeeSeparated(
  event: EmployeeSeparatedEvent,
  deps: EventBridgeDeps,
): Promise<void> {
  const docs: CreateComplianceDocumentInput[] = [
    {
      category: "hr",
      createdBy: "system",
      documentType: "exit_documents",
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      metadata: { employeeId: event.employeeId },
      name: `Exit Documents — ${event.employeeName}`,
      sourceEntityId: event.employeeId,
      sourceEntityType: "employee",
      sourceModule: "hr",
    },
    {
      category: "hr",
      createdBy: "system",
      documentType: "final_settlement",
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      metadata: { employeeId: event.employeeId },
      name: `Final Settlement — ${event.employeeName}`,
      sourceEntityId: event.employeeId,
      sourceEntityType: "employee",
      sourceModule: "hr",
    },
  ];

  for (const doc of docs) {
    await createDocument(doc, deps.documentDeps);
  }
}

async function handleVehicleRegistered(
  event: VehicleRegisteredEvent,
  deps: EventBridgeDeps,
): Promise<void> {
  await createDocument(
    {
      category: "vehicle",
      createdBy: "system",
      documentType: "pollution_certificate",
      expiryDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
      metadata: {
        emissionNorms: "BS6",
        vehicleRegistration: event.vehicleRegistration,
      },
      name: `Vehicle Pollution Certificate — ${event.vehicleRegistration}`,
      reminderDays: [60, 30, 7],
      renewalFrequency: "annual",
      sourceEntityId: event.vehicleId,
      sourceEntityType: "vehicle",
      sourceModule: "fleet",
    },
    deps.documentDeps,
  );

  await createObligation(
    {
      category: "vehicle",
      createdBy: "system",
      documentType: "pollution_certificate",
      expiryBased: true,
      expiryDurationMonths: 6,
      frequency: "semi_annual",
      name: `Vehicle Pollution Renewal — ${event.vehicleRegistration}`,
      sourceEntityId: event.vehicleId,
      sourceEntityType: "vehicle",
      sourceModule: "fleet",
      startDate: new Date(),
    },
    deps.obligationDeps,
  );
}

async function handleBranchCreated(
  event: BranchCreatedEvent,
  deps: EventBridgeDeps,
): Promise<void> {
  await createDocument(
    {
      branch: event.branch.id,
      category: "permit",
      createdBy: "system",
      documentType: "trade_license",
      expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      name: `Trade License — ${event.branch.name}`,
      reminderDays: [90, 60, 30, 7],
      sourceEntityId: event.branch.id,
      sourceEntityType: "branch",
      sourceModule: "organization",
    },
    deps.documentDeps,
  );

  await createDocument(
    {
      branch: event.branch.id,
      category: "safety",
      createdBy: "system",
      documentType: "fire_safety_certificate",
      expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      name: `Fire Safety Certificate — ${event.branch.name}`,
      reminderDays: [90, 60, 30, 7],
      sourceEntityId: event.branch.id,
      sourceEntityType: "branch",
      sourceModule: "organization",
    },
    deps.documentDeps,
  );

  await createObligation(
    {
      branch: event.branch.id,
      category: "permit",
      createdBy: "system",
      documentType: "trade_license",
      expiryBased: true,
      expiryDurationMonths: 12,
      frequency: "annual",
      name: `Annual Trade License Renewal — ${event.branch.name}`,
      sourceEntityId: event.branch.id,
      sourceEntityType: "branch",
      sourceModule: "organization",
      startDate: new Date(),
    },
    deps.obligationDeps,
  );
}

async function handleFinancialYearStarted(
  event: FinancialYearStartedEvent,
  deps: EventBridgeDeps,
): Promise<void> {
  await createObligation(
    {
      category: "tax",
      createdBy: "system",
      documentType: "GST Return",
      dueDay: 20,
      dueMonthOffset: 1,
      frequency: "monthly",
      name: `Monthly GST Returns — ${event.financialYear}`,
      periodBased: true,
      sourceModule: "accounting",
      startDate: new Date(),
    },
    deps.obligationDeps,
  );
}

async function handleConnectionCreated(
  event: ConnectionCreatedEvent,
  deps: EventBridgeDeps,
): Promise<void> {
  if (event.connection.type !== "insurer") return;

  await createDocument(
    {
      category: "insurance",
      connection: event.connection.id,
      createdBy: "system",
      documentType: "insurance_policy",
      metadata: { policyNumber: null },
      name: `Insurance Policy — ${event.connection.name}`,
      sourceModule: "organization",
    },
    deps.documentDeps,
  );
}
