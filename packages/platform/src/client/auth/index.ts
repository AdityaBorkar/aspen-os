import { apiKeyClient } from "@better-auth/api-key/client";
import { passkeyClient } from "@better-auth/passkey/client";
import {
  adminClient,
  // captchaClient,
  emailOTPClient,
  lastLoginMethodClient,
  organizationClient,
  phoneNumberClient,
  twoFactorClient,
  usernameClient,
} from "better-auth/client/plugins";
import type { ReactAuthClient } from "better-auth/react";
import { createAuthClient } from "better-auth/react";

import type { Unit } from "../types";

export interface AuthConfig {
  baseURL: string;
}

export type AuthClient = ReactAuthClient<{
  baseURL: string;
  plugins: [
    ReturnType<typeof adminClient>,
    ReturnType<typeof usernameClient>,
    ReturnType<typeof organizationClient>,
    ReturnType<typeof phoneNumberClient>,
    ReturnType<typeof emailOTPClient>,
    ReturnType<typeof apiKeyClient>,
    ReturnType<typeof lastLoginMethodClient>,
    ReturnType<typeof twoFactorClient>,
    // ReturnType<typeof captchaClient>,
    ReturnType<typeof passkeyClient>,
  ];
}>;

export class AuthUnit implements Unit<AuthConfig> {
  readonly $name = "auth";
  readonly $config: AuthConfig;
  readonly client: AuthClient;

  constructor(config: AuthConfig) {
    this.$config = config;
    this.client = createAuthClient({
      ...config,
      plugins: [
        adminClient(),
        usernameClient(),
        organizationClient(),
        phoneNumberClient(),
        emailOTPClient(),
        apiKeyClient(),
        lastLoginMethodClient(),
        twoFactorClient(),
        // captchaClient(),
        passkeyClient(),
      ],
    }) as unknown as AuthClient;
  }
}
