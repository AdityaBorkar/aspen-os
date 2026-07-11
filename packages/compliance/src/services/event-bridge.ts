import type { PubSubUnit } from "@aspen-os/framework/server";

import type { CreateComplianceDocumentInput } from "../types";
import type { DocumentWorkflow } from "../workflows/document";
import type { ObligationWorkflow } from "../workflows/obligation";

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

export class EventBridge {
  private subscribedTopics: string[] = [];

  constructor(
    private readonly pubsub: PubSubUnit,
    private readonly documents: DocumentWorkflow,
    private readonly obligations: ObligationWorkflow,
  ) {}

  async registerSubscriptions(): Promise<void> {
    await this.subscribeSafe("hr:employee_onboarded", async (data: unknown) => {
      const event = data as EmployeeOnboardedEvent;
      await this.handleEmployeeOnboarded(event);
    });

    await this.subscribeSafe("hr:employee_separated", async (data: unknown) => {
      const event = data as EmployeeSeparatedEvent;
      await this.handleEmployeeSeparated(event);
    });

    await this.subscribeSafe(
      "fleet:vehicle_registered",
      async (data: unknown) => {
        const event = data as VehicleRegisteredEvent;
        await this.handleVehicleRegistered(event);
      },
    );

    await this.subscribeSafe(
      "organization:branch_created",
      async (data: unknown) => {
        const event = data as BranchCreatedEvent;
        await this.handleBranchCreated(event);
      },
    );

    await this.subscribeSafe(
      "accounting:financial_year_started",
      async (data: unknown) => {
        const event = data as FinancialYearStartedEvent;
        await this.handleFinancialYearStarted(event);
      },
    );

    await this.subscribeSafe(
      "organization:connection_created",
      async (data: unknown) => {
        const event = data as ConnectionCreatedEvent;
        await this.handleConnectionCreated(event);
      },
    );
  }

  async unregister(): Promise<void> {
    for (const topic of this.subscribedTopics) {
      try {
        await this.pubsub.unsubscribe(topic);
      } catch {
        // ignore
      }
    }
    this.subscribedTopics = [];
  }

  private async subscribeSafe(
    topic: string,
    handler: (data: unknown) => Promise<void>,
  ): Promise<void> {
    try {
      await this.pubsub.subscribe(topic, async (message) => {
        await handler(message.data);
      });
      this.subscribedTopics.push(topic);
    } catch {
      // Source module not installed — silently no-op
    }
  }

  private async handleEmployeeOnboarded(
    event: EmployeeOnboardedEvent,
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
      await this.documents.create(doc);
    }
  }

  private async handleEmployeeSeparated(
    event: EmployeeSeparatedEvent,
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
      await this.documents.create(doc);
    }
  }

  private async handleVehicleRegistered(
    event: VehicleRegisteredEvent,
  ): Promise<void> {
    await this.documents.create({
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
    });

    await this.obligations.create({
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
    });
  }

  private async handleBranchCreated(event: BranchCreatedEvent): Promise<void> {
    await this.documents.create({
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
    });

    await this.documents.create({
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
    });

    await this.obligations.create({
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
    });
  }

  private async handleFinancialYearStarted(
    event: FinancialYearStartedEvent,
  ): Promise<void> {
    await this.obligations.create({
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
    });
  }

  private async handleConnectionCreated(
    event: ConnectionCreatedEvent,
  ): Promise<void> {
    if (event.connection.type !== "insurer") return;

    await this.documents.create({
      category: "insurance",
      connection: event.connection.id,
      createdBy: "system",
      documentType: "insurance_policy",
      metadata: { policyNumber: null },
      name: `Insurance Policy — ${event.connection.name}`,
      sourceModule: "organization",
    });
  }
}
