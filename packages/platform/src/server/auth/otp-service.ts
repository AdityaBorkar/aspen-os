const OTP_TTL_MS = 10 * 60 * 1000;
/** Hard cap so a burst of abandoned OTPs can never grow the store without bound. */
const OTP_MAX_ENTRIES = 5000;
/** Expired entries are swept at most this often, keeping `storeOtp` O(1) amortized. */
const OTP_SWEEP_INTERVAL_MS = 60_000;

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
 *
 * Entries are reclaimed by {@link sweepExpired} on write (and by {@link getOtp}
 * when the requested token has expired). Without the sweep, OTPs that are never
 * looked up again would stay in the map forever — an unbounded leak on a
 * long-lived server.
 */
const otpStore = new Map<string, StoredOtp>();
let lastSweepAt = 0;

function sweepExpired(now: number): void {
  if (now - lastSweepAt < OTP_SWEEP_INTERVAL_MS) {
    return;
  }
  lastSweepAt = now;
  for (const [tokenRef, entry] of otpStore) {
    if (entry.expiresAt < now) {
      otpStore.delete(tokenRef);
    }
  }
}

export function storeOtp(input: { email: string; otp: string; type: string }): string {
  const now = Date.now();
  sweepExpired(now);
  // Map preserves insertion order, so the first keys are the oldest.
  while (otpStore.size >= OTP_MAX_ENTRIES) {
    const oldest = otpStore.keys().next().value;
    if (oldest === undefined) {
      break;
    }
    otpStore.delete(oldest);
  }
  const tokenRef = crypto.randomUUID();
  otpStore.set(tokenRef, {
    email: input.email,
    expiresAt: now + OTP_TTL_MS,
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
