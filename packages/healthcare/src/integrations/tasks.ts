export const TASKS_OWNERSHIP = "tasks.task" as const;

export interface HealthcareOrderIntent {
  branchId: string;
  dueAt?: string | null;
  encounterId?: string | null;
  healthcareTaskId: string;
  kind?: string | null;
  orderId?: string | null;
  patientId: string;
  title: string;
}

export function healthcareTaskProjectId(branchId: string): string {
  return `healthcare-${branchId}`;
}

export function healthcareTaskTitle(intent: HealthcareOrderIntent): string {
  return intent.title;
}

export function healthcareTaskDescription(intent: HealthcareOrderIntent): string {
  return JSON.stringify({
    branchId: intent.branchId,
    encounterId: intent.encounterId ?? null,
    healthcareTaskId: intent.healthcareTaskId,
    kind: intent.kind ?? "general",
    orderId: intent.orderId ?? null,
    patientId: intent.patientId,
  });
}
