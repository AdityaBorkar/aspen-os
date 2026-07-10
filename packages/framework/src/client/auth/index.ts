import { passkeyClient } from "@better-auth/passkey/client";
import type { createAccessControl, Role } from "better-auth/client";
import {
  adminClient,
  emailOTPClient,
  lastLoginMethodClient,
  phoneNumberClient,
  twoFactorClient,
  usernameClient,
} from "better-auth/client/plugins";
import { createAuthClient, type ReactAuthClient } from "better-auth/react";

export interface AuthConfig {
  access_control: ReturnType<typeof createAccessControl>;
  baseURL: string;
  roles: Record<string, Role>;
}

const TypedClient = createAuthClient({
  plugins: [
    // adminClient(),
    emailOTPClient(),
    usernameClient(),
    lastLoginMethodClient(),
    phoneNumberClient(),
    twoFactorClient(),
    passkeyClient(),
  ],
});

export class AuthUnit {
  readonly name = "auth";
  readonly client: typeof TypedClient;

  constructor(config: AuthConfig) {
    const { baseURL, roles, access_control } = config;
    this.client = createAuthClient({
      baseURL,
      plugins: [
        adminClient({ ac: access_control, roles }),
        emailOTPClient(),
        usernameClient(),
        passkeyClient(),
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
