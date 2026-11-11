import { cacheLife, cacheTag } from "next/cache";
import { readPublicServices, readSettings } from "@/server/services/settings";

/**
 * Cached data for the public site (shared by every visitor, prerendered).
 * Read straight from the service layer; admin edits in Paramètres call
 * `revalidateTag("settings" | "services")` so the site updates at once.
 */
export async function getPublicSettings() {
  "use cache";
  cacheTag("settings");
  cacheLife("hours");
  return readSettings();
}

export async function getPublicServices() {
  "use cache";
  cacheTag("services");
  cacheLife("hours");
  return readPublicServices();
}
