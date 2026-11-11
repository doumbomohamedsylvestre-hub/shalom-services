import { readFileSync } from "node:fs";
import { expect, type Browser, type Page } from "@playwright/test";

type Role = "admin" | "reception" | "technician";
const creds = () => JSON.parse(readFileSync("tests/e2e/.auth/users.json", "utf8")) as { password: string; users: Record<Role, { username: string; name: string }> };

export const userName = (role: Role) => creds().users[role].name;

/** Signs in through the real login form; each role gets its own browser context. */
export async function signedIn(browser: Browser, role: Role): Promise<Page> {
  const context = await browser.newContext();
  const page = await context.newPage();
  const { password, users } = creds();
  await page.goto("/connexion");
  await page.getByLabel("Identifiant").fill(users[role].username);
  // Better Auth allows 3 sign-ins per 10 s per IP: wait out the window instead of weakening it.
  for (let attempt = 0; attempt < 4; attempt++) {
    await page.getByLabel("Mot de passe", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Se connecter" }).click();
    try {
      await expect(page).toHaveURL(/\/tableau-de-bord/, { timeout: 8_000 });
      return page;
    } catch {
      await page.waitForTimeout(11_000);
    }
  }
  throw new Error(`Sign-in failed for ${role}`);
}

/** Print pages open the dialog automatically: neutralize it. */
export async function noPrintDialog(page: Page) {
  // On the context, so tabs opened by "Imprimer" (target=_blank) get it too.
  await page.context().addInitScript(() => {
    window.print = () => {};
  });
}

export const uniqPhone = () => `7${String(Math.floor(Math.random() * 1e7)).padStart(7, "0")}`;
