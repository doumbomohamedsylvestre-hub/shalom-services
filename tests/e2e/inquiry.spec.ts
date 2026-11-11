import { expect, test } from "@playwright/test";
import { signedIn, uniqPhone } from "./helpers";

test("public quote request lands in the inbox and converts into a ticket", async ({ browser, page }) => {
  const name = `Demande ${Date.now().toString(36)}`;
  await page.goto("/devis");
  await page.getByLabel("Nom complet").fill(name);
  await page.getByLabel("Téléphone (WhatsApp)").fill(uniqPhone());
  await page.getByLabel("Appareil").fill("Tecno Spark 10");
  await page.getByLabel("Votre message").fill("L'écran reste noir après une chute.");
  await page.getByRole("button", { name: "Envoyer ma demande" }).click();
  await expect(page.getByText(/c'est bien reçu/)).toBeVisible();

  const reception = await signedIn(browser, "reception");
  await reception.goto("/tableau-de-bord/demandes");
  const card = reception.locator("li, article, tr, div").filter({ hasText: name }).filter({ has: reception.getByRole("button", { name: "Créer le ticket" }) }).last();
  await card.getByRole("button", { name: "Créer le ticket" }).click();
  await expect(reception).toHaveURL(/\/reparations\/[0-9a-f-]+\?nouveau=1/);
  await expect(reception.getByRole("heading", { name: /Tecno Spark 10/ })).toBeVisible();
});
