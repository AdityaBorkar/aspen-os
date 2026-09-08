import type { CreateComplianceDocumentInput, CreateObligationInput } from "#/schemas";
import { SYSTEM_ACTOR } from "#/utils/constants";
import { daysFromNow } from "#/utils/dates";
import { documents, obligations } from "#/workflows";

import type {
  AuditUnit,
  InferSchemaOutput,
  PubSubUnit,
  StandardSchema,
} from "@aspen-os/platform/server";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { nullable, object, string } from "valibot";

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

const OrgBranchCreatedEventSchema = object({
  orgBranch: object({
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
  // Nullable since contacts can be global address-book entries; only
  // organization-scoped insurer contacts produce insurance docs.
  entityType: nullable(string()),
});

type EmployeeOnboardedEvent = InferSchemaOutput<typeof EmployeeOnboardedEventSchema>;
type EmployeeSeparatedEvent = InferSchemaOutput<typeof EmployeeSeparatedEventSchema>;
type VehicleRegisteredEvent = InferSchemaOutput<typeof VehicleRegisteredEventSchema>;
type BranchCreatedEvent = InferSchemaOutput<typeof BranchCreatedEventSchema>;
type OrgBranchCreatedEvent = InferSchemaOutput<typeof OrgBranchCreatedEventSchema>;
type FinancialYearStartedEvent = InferSchemaOutput<typeof FinancialYearStartedEventSchema>;
type ContactCreatedEvent = InferSchemaOutput<typeof ContactCreatedEventSchema>;

export interface EventBridgeDeps {
  audit: AuditUnit;
  db: PostgresJsDatabase;
  pubsub: PubSubUnit;
}

const SUBSCRIPTIONS: {
  handler: (data: never, deps: EventBridgeDeps) => Promise<void>;
  schema: StandardSchema;
  topic: string;
}[] = [
  {
    handler: (data, deps) => handleEmployeeOnboarded(data, deps),
    schema: EmployeeOnboardedEventSchema,
    topic: "hr:employee_onboarded",
  },
  {
    handler: (data, deps) => handleEmployeeSeparated(data, deps),
    schema: EmployeeSeparatedEventSchema,
    topic: "hr:employee_separated",
  },
  {
    handler: (data, deps) => handleVehicleRegistered(data, deps),
    schema: VehicleRegisteredEventSchema,
    topic: "fleet:vehicle_registered",
  },
  {
    handler: (data, deps) => handleBranchCreated(data, deps),
    schema: OrgBranchCreatedEventSchema,
    topic: "masters:org_branch_created",
  },
  {
    handler: (data, deps) => handleBranchCreated(data, deps),
    schema: BranchCreatedEventSchema,
    topic: "organization:branch_created",
  },
  {
    handler: (data, deps) => handleBranchCreated(data, deps),
    schema: BranchCreatedEventSchema,
    topic: "branch:created",
  },
  {
    handler: (data, deps) => handleFinancialYearStarted(data, deps),
    schema: FinancialYearStartedEventSchema,
    topic: "accounting:financial_year_started",
  },
  {
    handler: (data, deps) => handleContactCreated(data, deps),
    schema: ContactCreatedEventSchema,
    topic: "masters:contact_created",
  },
];

export async function registerEventBridgeSubscriptions(deps: EventBridgeDeps): Promise<string[]> {
  await Promise.all(
    SUBSCRIPTIONS.map(async ({ handler, schema, topic }) =>
      deps.pubsub.subscribe(topic, async (message) => {
        const result = await schema["~standard"].validate(message.data);
        if (result.issues) {
          return;
        }
        // SAFETY: SUBSCRIPTIONS pairs each schema with its matching handler; result.value is that schema's validated output.
        await handler(result.value as never, deps);
      }),
    ),
  );
  return SUBSCRIPTIONS.map(({ topic }) => topic);
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

async function documentExists(
  deps: EventBridgeDeps,
  filter: { documentType?: string; sourceEntityId: string; sourceModule: string },
): Promise<boolean> {
  const rows = await documents.getBySource.run(
    {
      sourceEntityId: filter.sourceEntityId,
      sourceModule: filter.sourceModule,
    },
    { db: deps.db, pubsub: deps.pubsub },
  );
  if (!filter.documentType) {
    return rows.length > 0;
  }
  return rows.some((row) => row.document_type === filter.documentType);
}

async function createManyDocuments(
  inputs: CreateComplianceDocumentInput[],
  deps: EventBridgeDeps,
): Promise<void> {
  await Promise.all(
    inputs.map(async (input) => {
      if (input.sourceEntityId) {
        const exists = await documentExists(deps, {
          documentType: input.documentType ?? undefined,
          sourceEntityId: input.sourceEntityId,
          sourceModule: input.sourceModule,
        });
        if (exists) {
          return;
        }
      }
      await documents.create.run(
        { input },
        { audit: deps.audit, db: deps.db, pubsub: deps.pubsub },
      );
    }),
  );
}

async function createObligation(
  input: CreateObligationInput,
  deps: EventBridgeDeps,
): Promise<string> {
  const created = await obligations.create.run(
    { input },
    { audit: deps.audit, db: deps.db, pubsub: deps.pubsub },
  );
  return created.id;
}

function parseFinancialYearStart(financialYear: string, fallback: Date): Date {
  const match = /(?<year>20\d{2})/.exec(financialYear);
  const year = match?.groups?.year ? Number(match.groups.year) : Number.NaN;
  if (Number.isInteger(year)) {
    return new Date(Date.UTC(year, 3, 1));
  }
  return fallback;
}

async function handleEmployeeOnboarded(
  event: EmployeeOnboardedEvent,
  deps: EventBridgeDeps,
): Promise<void> {
  await createManyDocuments(
    [
      {
        category: "hr",
        createdBy: SYSTEM_ACTOR,
        documentType: "background_check",
        expiryDate: daysFromNow(365),
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
        createdBy: SYSTEM_ACTOR,
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
    ],
    deps,
  );
}

async function handleEmployeeSeparated(
  event: EmployeeSeparatedEvent,
  deps: EventBridgeDeps,
): Promise<void> {
  await createManyDocuments(
    [
      {
        category: "hr",
        createdBy: SYSTEM_ACTOR,
        documentType: "exit_documents",
        dueDate: daysFromNow(7),
        metadata: { employeeId: event.employeeId },
        name: `Exit Documents — ${event.employeeName}`,
        sourceEntityId: event.employeeId,
        sourceEntityType: "employee",
        sourceModule: "hr",
      },
      {
        category: "hr",
        createdBy: SYSTEM_ACTOR,
        documentType: "final_settlement",
        dueDate: daysFromNow(30),
        metadata: { employeeId: event.employeeId },
        name: `Final Settlement — ${event.employeeName}`,
        sourceEntityId: event.employeeId,
        sourceEntityType: "employee",
        sourceModule: "hr",
      },
    ],
    deps,
  );
}

async function handleVehicleRegistered(
  event: VehicleRegisteredEvent,
  deps: EventBridgeDeps,
): Promise<void> {
  const obligationId = await createObligation(
    {
      category: "vehicle",
      createdBy: SYSTEM_ACTOR,
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

  await createManyDocuments(
    [
      {
        category: "vehicle",
        createdBy: SYSTEM_ACTOR,
        documentType: "pollution_certificate",
        expiryDate: daysFromNow(180),
        metadata: {
          emissionNorms: "BS6",
          vehicleRegistration: event.vehicleRegistration,
        },
        name: `Vehicle Pollution Certificate — ${event.vehicleRegistration}`,
        obligationId,
        reminderDays: [60, 30, 7],
        renewalFrequency: "annual",
        sourceEntityId: event.vehicleId,
        sourceEntityType: "vehicle",
        sourceModule: "fleet",
      },
    ],
    deps,
  );
}

async function handleBranchCreated(
  event: BranchCreatedEvent | OrgBranchCreatedEvent,
  deps: EventBridgeDeps,
): Promise<void> {
  // SAFETY: Validated branch payloads have two shapes (branch vs orgBranch) from legacy and new topics; either validated shape carries the same identity.
  const raw = event as {
    branch?: BranchCreatedEvent["branch"];
    orgBranch?: OrgBranchCreatedEvent["orgBranch"];
  };
  const branch = raw.branch ?? raw.orgBranch;
  if (!branch) {
    return;
  }
  const obligationId = await createObligation(
    {
      branch: branch.id,
      category: "permit",
      createdBy: SYSTEM_ACTOR,
      documentType: "trade_license",
      expiryBased: true,
      expiryDurationMonths: 12,
      frequency: "annual",
      name: `Annual Trade License Renewal — ${branch.name}`,
      sourceEntityId: branch.id,
      sourceEntityType: "org_branch",
      sourceModule: "masters",
      startDate: new Date(),
    },
    deps,
  );

  await createManyDocuments(
    [
      {
        branch: branch.id,
        category: "permit",
        createdBy: SYSTEM_ACTOR,
        documentType: "trade_license",
        expiryDate: daysFromNow(365),
        name: `Trade License — ${branch.name}`,
        obligationId,
        reminderDays: [90, 60, 30, 7],
        sourceEntityId: branch.id,
        sourceEntityType: "org_branch",
        sourceModule: "masters",
      },
      {
        branch: branch.id,
        category: "safety",
        createdBy: SYSTEM_ACTOR,
        documentType: "fire_safety_certificate",
        expiryDate: daysFromNow(365),
        name: `Fire Safety Certificate — ${branch.name}`,
        reminderDays: [90, 60, 30, 7],
        sourceEntityId: branch.id,
        sourceEntityType: "org_branch",
        sourceModule: "masters",
      },
    ],
    deps,
  );
}

async function handleFinancialYearStarted(
  event: FinancialYearStartedEvent,
  deps: EventBridgeDeps,
): Promise<void> {
  const startDate = parseFinancialYearStart(event.financialYear, new Date());
  await createObligation(
    {
      category: "tax",
      createdBy: SYSTEM_ACTOR,
      documentType: "GST Return",
      dueDay: 20,
      dueMonthOffset: 1,
      frequency: "monthly",
      name: `Monthly GST Returns — ${event.financialYear}`,
      periodBased: true,
      sourceModule: "accounting",
      startDate,
    },
    deps,
  );
}

async function handleContactCreated(
  event: ContactCreatedEvent,
  deps: EventBridgeDeps,
): Promise<void> {
  // Only insurer contacts scoped to an organization produce insurance docs;
  // all other contact types are intentionally ignored.
  if (event.contact.type !== "insurer" || event.entityType !== "organization") {
    return;
  }

  await createManyDocuments(
    [
      {
        category: "insurance",
        connection: event.contact.id,
        createdBy: SYSTEM_ACTOR,
        documentType: "insurance_policy",
        name: `Insurance Policy — ${event.contact.name}`,
        sourceEntityId: event.contact.id,
        sourceEntityType: "contact",
        sourceModule: "masters",
      },
    ],
    deps,
  );
}
