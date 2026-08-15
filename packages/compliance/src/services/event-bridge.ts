import type { CreateComplianceDocumentInput } from "#/types";
import { documents, obligations } from "#/workflows";

import type {
  AuditUnit,
  InferSchemaOutput,
  PubSubUnit,
  StandardSchema,
} from "@aspen-os/platform/server";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { object, string } from "valibot";

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

interface ContactCreatedEvent {
  contact: {
    id: string;
    name: string;
    type: string;
  };
  entityType: string;
}

const EmployeeOnboardedEventSchema = object({
  employeeId: string(),
  employeeName: string(),
});

const EmployeeSeparatedEventSchema = object({
  employeeId: string(),
  employeeName: string(),
});

const VehicleRegisteredEventSchema = object({
  vehicleId: string(),
  vehicleRegistration: string(),
});

const BranchCreatedEventSchema = object({
  branch: object({
    code: string(),
    id: string(),
    name: string(),
    type: string(),
  }),
});

const FinancialYearStartedEventSchema = object({
  financialYear: string(),
});

const ContactCreatedEventSchema = object({
  contact: object({
    id: string(),
    name: string(),
    type: string(),
  }),
  entityType: string(),
});

export interface EventBridgeDeps {
  audit: AuditUnit;
  db: NodePgDatabase;
  pubsub: PubSubUnit;
}

export async function registerEventBridgeSubscriptions(deps: EventBridgeDeps): Promise<string[]> {
  const topics: string[] = [];
  const subscribe = subscribeSafe(deps);

  await subscribe("hr:employee_onboarded", EmployeeOnboardedEventSchema, async (data) => {
    await handleEmployeeOnboarded(data, deps);
  });
  topics.push("hr:employee_onboarded");

  await subscribe("hr:employee_separated", EmployeeSeparatedEventSchema, async (data) => {
    await handleEmployeeSeparated(data, deps);
  });
  topics.push("hr:employee_separated");

  await subscribe("fleet:vehicle_registered", VehicleRegisteredEventSchema, async (data) => {
    await handleVehicleRegistered(data, deps);
  });
  topics.push("fleet:vehicle_registered");

  await subscribe("organization:branch_created", BranchCreatedEventSchema, async (data) => {
    await handleBranchCreated(data, deps);
  });
  topics.push("organization:branch_created");

  await subscribe(
    "accounting:financial_year_started",
    FinancialYearStartedEventSchema,
    async (data) => {
      await handleFinancialYearStarted(data, deps);
    },
  );
  topics.push("accounting:financial_year_started");

  await subscribe("masters:contact_created", ContactCreatedEventSchema, async (data) => {
    await handleContactCreated(data, deps);
  });
  topics.push("masters:contact_created");

  return topics;
}

export async function unregisterEventBridge(
  topics: string[],
  { pubsub }: Pick<EventBridgeDeps, "pubsub">,
): Promise<void> {
  await Promise.all(
    topics.map(async (topic) => {
      try {
        await pubsub.unsubscribe(topic);
      } catch {
        // Ignore
      }
    }),
  );
}

function subscribeSafe(deps: EventBridgeDeps) {
  return async function subscribe<TSchema extends StandardSchema>(
    topic: string,
    schema: TSchema,
    handler: (data: InferSchemaOutput<TSchema>) => Promise<void>,
  ): Promise<void> {
    try {
      await deps.pubsub.subscribe(topic, async (message) => {
        const result = await schema["~standard"].validate(message.data);
        if (!result.issues) {
          await handler(result.value);
        }
      });
    } catch {
      // Source module not installed — silently no-op
    }
  };
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

  await Promise.all(docs.map(async (doc) => createDocumentWorkflow(doc, deps)));
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

  await Promise.all(docs.map(async (doc) => createDocumentWorkflow(doc, deps)));
}

async function handleVehicleRegistered(
  event: VehicleRegisteredEvent,
  deps: EventBridgeDeps,
): Promise<void> {
  await createDocumentWorkflow(
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
    deps,
  );

  await createObligationWorkflow(
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
    deps,
  );
}

async function handleBranchCreated(
  event: BranchCreatedEvent,
  deps: EventBridgeDeps,
): Promise<void> {
  await createDocumentWorkflow(
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
    deps,
  );

  await createDocumentWorkflow(
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
    deps,
  );

  await createObligationWorkflow(
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
    deps,
  );
}

async function handleFinancialYearStarted(
  event: FinancialYearStartedEvent,
  deps: EventBridgeDeps,
): Promise<void> {
  await createObligationWorkflow(
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
    deps,
  );
}

async function handleContactCreated(
  event: ContactCreatedEvent,
  deps: EventBridgeDeps,
): Promise<void> {
  if (event.contact.type !== "insurer" || event.entityType !== "organization") {
    return;
  }

  await createDocumentWorkflow(
    {
      category: "insurance",
      connection: event.contact.id,
      createdBy: "system",
      documentType: "insurance_policy",
      metadata: { policyNumber: null },
      name: `Insurance Policy — ${event.contact.name}`,
      sourceModule: "masters",
    },
    deps,
  );
}

async function createDocumentWorkflow(
  input: CreateComplianceDocumentInput,
  deps: EventBridgeDeps,
): Promise<void> {
  await documents.create.run({ input }, { audit: deps.audit, db: deps.db, pubsub: deps.pubsub });
}

async function createObligationWorkflow(
  input: {
    branch?: string;
    category: "vehicle" | "permit" | "tax";
    createdBy: string;
    documentType?: string;
    dueDay?: number;
    dueMonthOffset?: number;
    expiryBased?: boolean;
    expiryDurationMonths?: number;
    frequency: "semi_annual" | "annual" | "monthly";
    name: string;
    periodBased?: boolean;
    sourceEntityId?: string;
    sourceEntityType?: string;
    sourceModule: string;
    startDate: Date;
  },
  deps: EventBridgeDeps,
): Promise<void> {
  await obligations.create.run({ input }, { audit: deps.audit, db: deps.db, pubsub: deps.pubsub });
}
