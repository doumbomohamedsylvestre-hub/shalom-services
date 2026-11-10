import { cacheLife, cacheTag } from "next/cache";
import * as api from "@/client/api";

/**
 * Cached data for the public site (shared by every visitor, prerendered).
 * When the backend lands, these call the service layer instead of the demo
 * API, and admin edits call `revalidateTag("settings" | "services")`.
 */
export async function getPublicSettings() {
  "use cache";
  cacheTag("settings");
  cacheLife("hours");
  return api.getSettings();
}

export async function getPublicServices() {
  "use cache";
  cacheTag("services");
  cacheLife("hours");
  return api.getServices({ publicOnly: true });
}
