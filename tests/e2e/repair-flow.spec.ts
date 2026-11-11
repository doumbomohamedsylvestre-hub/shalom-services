import { expect, test, type Page } from "@playwright/test";
import { signedIn, uniqPhone } from "./helpers";

/** Clicks a status action and waits until the server confirmed it. */
async function step(page: Page, name: string) {
  await page.getByRole("button", { name, exact: true }).click();
  await expect(page.getByText("Statut mis à jour.").last()).toBeVisible();
  await expect(page.getByRole("button", { name, exact: true })).toHaveCount(0);
}

test("intake → technician → quote → approval → repair → payment → pickup → public tracking", async ({ browser, page }) => {
  const phone = uniqPhone();
  const reception = await signedIn(browser, "reception");

  // Intake (reception)
  await reception.goto("/tableau-de-bord/reparations/nouvelle");
  await reception.getByLabel("Téléphone").fill(phone);
  await reception.getByLabel("Nom complet").fill("Client Playwright");
  await reception.getByLabel("Marque").click();
  await reception.getByRole("option", { name: "Samsung" }).click();
  await reception.getByLabel("Modèle").fill("Galaxy A14");
  await reception.getByLabel("Panne décrite par le client").fill("Écran cassé après une chute");
  await reception.getByRole("button", { name: "Créer le ticket" }).click();
  const created = reception.getByText(/Ticket SS-[A-Z0-9]{6} créé/);
  await expect(created).toBeVisible();
  const code = (await created.textContent())!.match(/SS-[A-Z0-9]{6}/)![0];
  const ticketUrl = reception.url().replace(/\?.*$/, "");

  // Diagnosis and quote (technician)
  const tech = await signedIn(browser, "technician");
  await tech.goto(ticketUrl);
  await tech.getByRole("button", { name: "Prendre en charge" }).click();
  await expect(tech.getByText(/vous est attribué/)).toBeVisible();
  await step(tech, "Commencer le diagnostic");
  await tech.getByRole("button", { name: "Ajouter", exact: true }).click();
  await tech.getByPlaceholder("Rechercher une prestation ou un produit…").fill("écran");
  await tech.getByRole("option").first().click();
  await expect(tech.getByText("Ligne ajoutée.")).toBeVisible();
  await step(tech, "Marquer le devis envoyé");

  // Customer agrees (reception), repair (technician)
  await reception.reload();
  await step(reception, "Devis accepté");
  await tech.reload();
  await step(tech, "Lancer la réparation");
  await step(tech, "Marquer prêt");

  // Pickup: the balance must be paid first (reception)
  await reception.reload();
  await expect(reception.getByRole("button", { name: "Remettre au client" })).toBeDisabled();
  await reception.getByRole("button", { name: "Encaisser", exact: true }).click();
  await reception.getByRole("dialog").getByRole("button", { name: "Enregistrer" }).click();
  await expect(reception.getByText("Paiement enregistré.")).toBeVisible();
  await step(reception, "Remettre au client");
  await expect(reception.getByText("Récupéré").first()).toBeVisible();

  // Public tracking: code + phone, timeline only
  await page.goto("/suivi");
  await page.getByLabel("Code de suivi").fill(code);
  await page.getByLabel("Numéro de téléphone").fill(phone);
  await page.getByRole("button", { name: "Voir l'avancement" }).click();
  await expect(page.getByText("Client P.")).toBeVisible();
  await expect(page.getByText(/Récupéré/).first()).toBeVisible();
  await expect(page.getByText(/FCFA/)).toHaveCount(0);
});
