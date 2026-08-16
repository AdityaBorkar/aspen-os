import type { Recipient, RecipientType } from "#/types";

import type { AuthUnit } from "@aspen-os/platform/server";

export interface ResolvedRecipient {
  recipientId: string;
  recipientType: RecipientType;
  to: { email?: string; name?: string; phone?: string } | null;
}

export async function resolveRecipient(
  recipient: Recipient,
  auth: AuthUnit,
): Promise<ResolvedRecipient | null> {
  if (recipient.type === "contact") {
    return {
      recipientId: recipient.id,
      recipientType: "contact",
      to: {
        email: recipient.email,
        name: recipient.name,
        phone: recipient.phone,
      },
    };
  }

  const user = await auth.rest.user.get({ id: recipient.id });
  if (!user) {
    return null;
  }

  return {
    recipientId: recipient.id,
    recipientType: "user",
    to: {
      email: user.email,
      name: user.name,
      phone: user.phoneNumber ?? undefined,
    },
  };
}
