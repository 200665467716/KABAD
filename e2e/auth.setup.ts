import { expect, test as setup } from "@playwright/test";

/* Signs in once as Kossi; the screen tests reuse this session. */
setup("connexion de Kossi", async ({ page }) => {
  await page.goto("/connexion");
  await page.getByLabel("E-mail").fill("kossi.mensah@exemple.tg");
  await page.getByLabel("Mot de passe", { exact: true }).fill("kabad-demo-2026");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).toHaveURL((url) => url.pathname === "/accueil", { timeout: 30_000 });
  await page.context().storageState({ path: "e2e/.auth/kossi.json" });
});
