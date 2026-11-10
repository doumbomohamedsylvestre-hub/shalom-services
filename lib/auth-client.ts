"use client";

import { adminClient, usernameClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { ac, roles } from "@/shared/auth/permissions";

// Same origin as the app, so no baseURL is needed.
export const authClient = createAuthClient({
  plugins: [usernameClient(), adminClient({ ac, roles })],
});
