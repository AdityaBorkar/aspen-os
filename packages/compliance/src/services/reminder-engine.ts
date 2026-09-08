// Deprecated: compliance reminder engine removed. Compliance now publishes
// compliance:document_expiring facts from document workflows; the calendar
// module's compliance bridge materializes calendar_reminder rows (same pattern
// as the task bridge). The single dispatcher is calendar:reminder-scan
// (* * * * *) publishing calendar:reminder_due. This file is retained only
// to avoid breaking imports during migration and will be deleted.

export async function registerReminderSchedules(): Promise<void> {}
export async function registerReminderHandlers(): Promise<string[]> {
  return [];
}
export async function unregisterReminderEngine(): Promise<void> {}
