import { createBetterAuthService } from "./unit";

// @ts-expect-error Stub file only for DB Schema Generation — null db is never used at runtime.
export const auth = createBetterAuthService({}, null, {});
