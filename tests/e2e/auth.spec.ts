import { expect, test } from "@playwright/test";
import { signedIn } from "./helpers";

test("the back office requires a session and keeps the requested page", async ({ page }) => {
  await page.goto("/tableau-de-bord/stock");
  await expect(page).toHaveURL(/\/connexion\?next=%2Ftableau-de-bord%2Fstock/);
});

test("a wrong password is refused with a French message", async ({ page }) => {
  await page.goto("/connexion");
  await page.getByLabel("Identifiant").fill("personne.inconnue");
  await page.getByLabel("Mot de passe", { exact: true }).fill("mauvais-mot-de-passe");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page.getByText("Identifiant ou mot de passe incorrect.")).toBeVisible();
});

test("a technician has no access to money screens", async ({ browser }) => {
  const tech = await signedIn(browser, "technician");
  await expect(tech.getByRole("link", { name: "Ventes" })).toHaveCount(0);
  await expect(tech.getByRole("link", { name: "Rapports" })).toHaveCount(0);
});
