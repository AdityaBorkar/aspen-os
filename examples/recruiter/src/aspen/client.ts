import {
  emailOTPClient,
  phoneNumberClient,
  usernameClient,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

const auth = createAuthClient({
  plugins: [emailOTPClient(), phoneNumberClient(), usernameClient()],
});

export const {
  signIn,
  signOut,
  //   useSession,
  //   getSession,
  //   listSessions,
  //   revokeSession,
} = auth;
