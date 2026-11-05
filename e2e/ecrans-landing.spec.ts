import { expect, test } from "@playwright/test";

/* The landing page: its call to action leads to the welcome screen, and the presentation loads only on demand. */
test.use({ storageState: { cookies: [], origins: [] } });

test("« Rejoindre la communauté » mène à l’écran où l’on s’inscrit ou se connecte", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("devs africains");
  await page.getByRole("link", { name: "Rejoindre la communauté" }).first().click();
  await expect(page).toHaveURL(/\/bienvenue$/);
  await expect(page.getByRole("link", { name: /Créer mon compte/ })).toBeVisible();
  await expect(page.getByRole("link", { name: "Se connecter" })).toBeVisible();
});

test("la présentation ne se charge qu’au clic, puis s’enchaîne et se met en pause", async ({ page }) => {
  await page.goto("/");
  const player = page.locator("#presentation");
  // Before the click, only the poster: no player, no scene.
  await expect(player.getByRole("button", { name: "Aller à la scène 1" })).toHaveCount(0);
  await page.getByRole("button", { name: /Lancer la présentation/ }).click();
  await expect(player.getByRole("button", { name: "Aller à la scène 1" })).toHaveAttribute("aria-current", "step");
  // The first scene lasts 4 s, then the second one starts on its own.
  await expect(player.getByRole("button", { name: "Aller à la scène 2" })).toHaveAttribute("aria-current", "step", { timeout: 8_000 });
  await player.getByRole("button", { name: "Mettre en pause" }).click();
  await expect(player.getByRole("button", { name: "Reprendre" })).toBeVisible();
});
