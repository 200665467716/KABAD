import { expect, test } from "@playwright/test";

/* The landing page: its buttons lead to sign-up and sign-in, the feature tabs and the scrolling band work. */
test.use({ storageState: { cookies: [], origins: [] } });

test("« Créer mon compte » mène à l’inscription et « Se connecter » à la connexion", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("nouvelle génération de développeurs");
  await page.locator("#cta-main").click();
  await expect(page).toHaveURL(/\/inscription$/);
  await page.goto("/");
  await page.getByRole("link", { name: "Se connecter" }).first().click();
  await expect(page).toHaveURL(/\/connexion$/);
});

test("les onglets des fonctionnalités changent l’écran du téléphone, au clic et au clavier", async ({ page }) => {
  await page.goto("/");
  const tabs = page.getByRole("tablist", { name: "Fonctionnalités" });
  await expect(tabs.getByRole("tab", { name: /Mentorat/ })).toHaveAttribute("aria-selected", "true");
  await tabs.getByRole("tab", { name: /Hackathons/ }).click();
  await expect(tabs.getByRole("tab", { name: /Hackathons/ })).toHaveAttribute("aria-selected", "true");
  await expect(page.locator("#scr-hack")).toBeVisible();
  // The list stays on screen after a click (it used to vanish: React erased the class added by the reveal effect).
  await expect(tabs).toHaveClass(/\bin\b/);
  await expect(tabs).toHaveCSS("opacity", "1");
  await page.keyboard.press("ArrowDown");
  await expect(tabs.getByRole("tab", { name: /Tests d’apps/ })).toBeFocused();
  await expect(page.locator("#scr-test")).toBeVisible();
});

test("la bande défilante se met en pause avec son bouton", async ({ page }) => {
  await page.goto("/");
  const pause = page.getByRole("button", { name: "Mettre en pause le défilement" });
  await pause.click();
  await expect(page.getByRole("button", { name: "Reprendre le défilement" })).toHaveAttribute("aria-pressed", "true");
  // The CADEV logo sits in the band; it is loaded (a broken image has no width).
  const logo = page.getByRole("img", { name: "Logo de la Coupe d’Afrique des développeurs" });
  await expect(logo).toBeVisible();
  expect(await logo.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
});
