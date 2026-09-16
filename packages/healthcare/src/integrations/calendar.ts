export const CALENDAR_OWNERSHIP_EVENT = "calendar.event" as const;

export const CALENDAR_OWNERSHIP_REMINDER = "calendar.reminder" as const;

export interface HealthcareAppointmentIntent {
  appointmentId: string;
  branchId: string;
  patientId: string;
  practitionerId?: string;
  slotStart: string;
}

export interface HealthcareRecallIntent {
  branchId: string;
  patientId: string;
  reason?: string;
  recallAt: string;
  recallId: string;
}

export function healthcareCalendarId(branchId: string): string {
  return `healthcare-${branchId}`;
}

export function appointmentEventTitle(intent: HealthcareAppointmentIntent): string {
  return `Appointment ${intent.appointmentId}`;
}

export function recallReminderMessage(intent: HealthcareRecallIntent): string {
  return intent.reason ?? `Recall ${intent.recallId}`;
}
