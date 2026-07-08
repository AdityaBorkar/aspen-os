import { createAuthClient } from "better-auth/react";

import type { AuthConfig } from "./types";

export { createAccessControl } from "better-auth/plugins/access";

export type {
  AuthConfig,
  Permission,
  Session,
  User,
} from "./types";

export class AuthUnit {
  readonly name = "auth";
  readonly client;

  constructor(config: AuthConfig) {
    this.client = createAuthClient({
      baseURL: config.baseURL,
      // plugins: [emailOTPClient(), phoneNumberClient(), usernameClient()],
    });
  }

  async prepare(): Promise<void> {
    return;
  }

  async destroy(): Promise<void> {
    // Auth cleanup if needed
  }
}
