import postgres from "postgres";

import { createBetterAuthService } from "./unit";

const pool = postgres({ database: "postgresql://username:password@localhost:4321/stub" });

// @ts-expect-error Stub file only for DB Schema Generation — null db is never used at runtime.
export const auth = createBetterAuthService({}, pool, {});
