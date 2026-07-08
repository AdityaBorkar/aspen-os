import {
  adminClient,
  emailOTPClient,
  phoneNumberClient,
  usernameClient,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

import type { AuthConfig } from "./types";

export type { AuthConfig } from "./types";

export class AuthUnit {
  readonly name = "auth";
  readonly client: ReturnType<typeof createAuthClient>;

  constructor(config: AuthConfig) {
    const { baseURL, roles, access_control } = config;
    this.client = createAuthClient({
      baseURL,
      plugins: [
        adminClient({ ac: access_control, roles }),
        emailOTPClient(),
        usernameClient(),
        phoneNumberClient(),
      ],
    });
  }

  async prepare(): Promise<void> {
    return;
  }

  async destroy(): Promise<void> {
    // Auth cleanup if needed
  }
}
