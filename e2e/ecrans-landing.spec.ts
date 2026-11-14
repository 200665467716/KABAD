import { expect, test } from "@playwright/test";

/* The landing page: its buttons lead to sign-up and sign-in, the feature tabs and the scrolling band work. */
test.use({ storageState: { cookies: [], origins: [] } });

test("« Créer mon compte » mène à l’inscription et « Se connecter » à la connexion", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("nouvelle génération de devs");
  await page.locator("#cta-main").click();
  await expect(page).toHaveURL(/\/inscription$/);
  await page.goto("/");
  await page.getByRole("link", { name: "Se connecter" }).first().click();
  await expect(page).toHaveURL(/\/connexion$/);
});

test("les fonctionnalités s’ouvrent une à la fois, avec leur écran, au clic et au clavier", async ({ page }) => {
  await page.goto("/");
  const mentoring = page.getByRole("button", { name: "Mentorat", exact: true });
  const hack = page.getByRole("button", { name: "Hackathons", exact: true });
  await expect(mentoring).toHaveAttribute("aria-expanded", "true");
  await hack.click();
  await expect(hack).toHaveAttribute("aria-expanded", "true");
  await expect(mentoring).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator("#pan-mentor")).toHaveAttribute("inert", "");
  await expect(page.getByRole("region", { name: "Hackathons" })).toBeVisible();
  // The screen of the open feature: in the phone on the right on a computer, under the description on a phone.
  if (test.info().project.name === "telephone") await expect(page.locator("#pan-hack .acc-phone .phone")).toBeVisible();
  else await expect(page.locator("#scr-hack")).toHaveClass(/\bon\b/);
  // The list stays on screen after a click (it used to vanish: React erased the class added by the reveal effect).
  const list = page.locator(".acc");
  await expect(list).toHaveClass(/\bin\b/);
  await expect(list).toHaveCSS("opacity", "1");
  await page.keyboard.press("ArrowDown");
  const tests = page.getByRole("button", { name: "Tests d’apps", exact: true });
  await expect(tests).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(tests).toHaveAttribute("aria-expanded", "true");
  await expect(hack).toHaveAttribute("aria-expanded", "false");
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
