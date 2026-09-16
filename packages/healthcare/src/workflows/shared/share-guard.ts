export function assertShareConfirmed(recipientConfirm: string): void {
  if (recipientConfirm !== "yes") {
    throw new Error("Recipient must confirm before sharing; obtain confirmation and retry");
  }
}
