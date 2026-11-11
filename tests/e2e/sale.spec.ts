import { expect, test } from "@playwright/test";
import { noPrintDialog, signedIn } from "./helpers";

test("counter sale: add an item, take payment, stock and receipt follow", async ({ browser }) => {
  const reception = await signedIn(browser, "reception");
  await reception.goto("/tableau-de-bord/ventes/nouvelle");
  const item = reception.locator("button:not([disabled])", { hasText: "en stock" }).first();
  await item.click();
  await reception.getByRole("button", { name: /^Compléter/ }).click();
  await reception.getByRole("button", { name: "Encaisser" }).click();
  const done = reception.getByRole("heading", { name: /Vente [A-Z0-9]+-\d{5} enregistrée/ });
  await expect(done).toBeVisible();

  // The 80 mm receipt prints the real sale.
  const number = (await done.textContent())!.match(/[A-Z0-9]+-\d{5}/)![0];
  await noPrintDialog(reception);
  const [receipt] = await Promise.all([reception.waitForEvent("popup"), reception.getByRole("button", { name: "Imprimer le reçu" }).click()]);
  await expect(receipt.getByText(`REÇU DE VENTE ${number}`)).toBeVisible();
});
