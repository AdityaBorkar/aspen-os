import { apiKeyClient } from "@better-auth/api-key/client";
import { passkeyClient } from "@better-auth/passkey/client";
import type { AccessControl, Role } from "better-auth/client";
import {
  adminClient,
  emailOTPClient,
  organizationClient,
  phoneNumberClient,
  usernameClient,
} from "better-auth/client/plugins";
import type { ReactAuthClient } from "better-auth/react";
import { createAuthClient } from "better-auth/react";

export interface AuthConfig<
  AC extends AccessControl = AccessControl,
  R extends Record<string, Role> = Record<string, Role>,
> {
  access_control: AC;
  baseURL: string;
  roles: R;
}

type ResolvePlugins<
  AC extends AccessControl,
  R extends Record<string, Role>,
> = [
  ReturnType<typeof adminClient<{ ac: AC; roles: R }>>,
  ReturnType<typeof emailOTPClient>,
  ReturnType<typeof usernameClient>,
  ReturnType<typeof passkeyClient>,
  ReturnType<typeof phoneNumberClient>,
];

export type AuthClient<
  AC extends AccessControl = AccessControl,
  R extends Record<string, Role> = Record<string, Role>,
> = ReactAuthClient<{
  baseURL: string;
  plugins: ResolvePlugins<AC, R>;
}>;

export class AuthUnit<
  AC extends AccessControl = AccessControl,
  R extends Record<string, Role> = Record<string, Role>,
> {
  readonly $name = "auth";
  readonly client: AuthClient<AC, R>;

  constructor(config: AuthConfig<AC, R>) {
    const { baseURL, roles, access_control } = config;
    this.client = createAuthClient({
      baseURL,
      plugins: [
        adminClient({ ac: access_control, roles }),
        usernameClient(),
        passkeyClient(),
        emailOTPClient(),
        phoneNumberClient(),
        organizationClient(),
        apiKeyClient(),
      ],
    }) as unknown as AuthClient<AC, R>;
  }

  async $prepare(): Promise<void> {
    return;
  }

  async $destroy(): Promise<void> {
    return;
  }
}
