const OTP_TTL_MS = 10 * 60 * 1000;

interface StoredOtp {
  email: string;
  expiresAt: number;
  otp: string;
  type: string;
}

/**
 * Short-lived in-process store for verification OTPs, keyed by a tokenRef.
 * The OTP is never placed on a pubsub queue; only the tokenRef is published so
 * the comms consumer can fetch the value at render time and never persist it.
 */
const otpStore = new Map<string, StoredOtp>();

export function storeOtp(input: { email: string; otp: string; type: string }): string {
  const tokenRef = crypto.randomUUID();
  otpStore.set(tokenRef, {
    email: input.email,
    expiresAt: Date.now() + OTP_TTL_MS,
    otp: input.otp,
    type: input.type,
  });
  return tokenRef;
}

export function getOtp(tokenRef: string): { email: string; otp: string; type: string } | null {
  const entry = otpStore.get(tokenRef);
  if (!entry) {
    return null;
  }
  if (entry.expiresAt < Date.now()) {
    otpStore.delete(tokenRef);
    return null;
  }
  return { email: entry.email, otp: entry.otp, type: entry.type };
}
