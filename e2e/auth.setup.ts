import { expect, test as setup } from "@playwright/test";
import { ACCOUNTS } from "./accounts";

/* Signs in once as Koffi; the screen tests reuse this session. */
setup("connexion de Koffi", async ({ page }) => {
  await page.goto("/connexion");
  await page.getByLabel("E-mail").fill(ACCOUNTS.koffi.email);
  await page.getByLabel("Mot de passe", { exact: true }).fill(ACCOUNTS.koffi.password);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).toHaveURL((url) => url.pathname === "/accueil", { timeout: 30_000 });
  await page.context().storageState({ path: "e2e/.auth/koffi.json" });
});
