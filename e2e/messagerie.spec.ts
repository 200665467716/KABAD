import { expect, test, type Browser, type Page } from "@playwright/test";
import { ACCOUNTS } from "./accounts";

/*
 * Real messaging: two or three members signed in at the same time, in separate browsers.
 * The demo data is reset before the run (e2e/global-setup.ts). Accounts and passwords: e2e/accounts.ts.
 */
/** Next.js keeps the previous screen hidden in the page: look inside the visible message thread only. */
const thread = (page: Page) => page.getByRole("main", { name: "Messages" });
const EMAIL = { koffi: ACCOUNTS.koffi, sadio: ACCOUNTS.sadio, chidi: ACCOUNTS.chidi } as const;

test.describe.configure({ mode: "serial" });

async function signIn(browser: Browser, who: keyof typeof EMAIL): Promise<Page> {
  const context = await browser.newContext({ locale: "fr-FR", viewport: { width: 412, height: 915 } });
  const page = await context.newPage();
  await page.goto("/connexion?suite=/messages");
  await page.getByLabel("E-mail").fill(EMAIL[who].email);
  await page.getByLabel("Mot de passe", { exact: true }).fill(EMAIL[who].password);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).toHaveURL((url) => url.pathname === "/messages");
  await expect(page.getByRole("heading", { name: "Messages" })).toBeVisible();
  return page;
}

test("la connexion refuse un mauvais mot de passe", async ({ page }) => {
  await page.goto("/connexion");
  await page.getByLabel("E-mail").fill(EMAIL.koffi.email);
  await page.getByLabel("Mot de passe", { exact: true }).fill("mauvais-mot-de-passe");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page.getByText("E-mail ou mot de passe incorrect.")).toBeVisible();
});

test("un message arrive chez l’autre membre sans recharger la page", async ({ browser }) => {
  const koffi = await signIn(browser, "koffi");
  const sadio = await signIn(browser, "sadio");

  await koffi.getByRole("link", { name: /Sadio Diop/ }).click();
  await sadio.getByRole("link", { name: /Koffi Mensah/ }).click();
  await expect(thread(sadio).getByText("Tu as avancé sur l’écran de paiement ?")).toBeVisible();

  const text = `Je corrige ce soir (${Date.now()})`;
  await koffi.getByRole("textbox").last().fill(text);
  await koffi.getByRole("button", { name: "Envoyer" }).click();
  await expect(thread(koffi).getByText(text)).toBeVisible();
  await expect(thread(sadio).getByText(text)).toBeVisible({ timeout: 10_000 });

  // The message survives a reload: it is in the database.
  await sadio.reload();
  await expect(thread(sadio).getByText(text)).toBeVisible();

  await koffi.context().close();
  await sadio.context().close();
});

test("un groupe privé avec un thème : tout le monde reçoit en direct, et son responsable le renomme", async ({ browser }) => {
  const koffi = await signIn(browser, "koffi");
  const sadio = await signIn(browser, "sadio");

  await koffi.goto("/messages/groupes/nouveau");
  await koffi.getByLabel("Nom du groupe").fill("Revue de code");
  await koffi.getByRole("button", { name: "Entraide" }).click();
  await koffi.getByRole("checkbox", { name: /Sadio Diop/ }).check();
  await koffi.getByRole("button", { name: "Créer le groupe" }).click();
  await expect(thread(koffi).getByText(/Koffi a créé le groupe/)).toBeVisible();

  await expect(sadio.getByRole("link", { name: /Revue de code/ })).toBeVisible({ timeout: 10_000 });
  await sadio.getByRole("link", { name: /Revue de code/ }).click();
  const text = `Je relis ta PR ce soir (${Date.now()})`;
  await koffi.getByRole("textbox").last().fill(text);
  await koffi.getByRole("button", { name: "Envoyer" }).click();
  await expect(thread(sadio).getByText(text)).toBeVisible({ timeout: 10_000 });

  // The owner renames the group from « Infos du groupe »: the other member reads it at once.
  await koffi.getByRole("button", { name: "Infos du groupe" }).click();
  await koffi.getByRole("button", { name: "Modifier" }).click();
  await koffi.locator("#group-name").fill("Revue de code du jeudi");
  await koffi.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await expect(thread(sadio).getByText("Koffi a renommé le groupe « Revue de code du jeudi »")).toBeVisible({ timeout: 10_000 });

  await koffi.context().close();
  await sadio.context().close();
});

test("accepter une invitation ouvre la conversation avec le premier message", async ({ browser }) => {
  const koffi = await signIn(browser, "koffi");
  await koffi.goto("/messages/invitations");
  // Accepting from the list opens the conversation straight away, like the detail page.
  await koffi.getByRole("button", { name: "Accepter" }).first().click();
  await expect(koffi).toHaveURL(/\/messages\/(?!invitations)[^/]+$/);
  await expect(thread(koffi).getByText(/a accepté l’invitation/)).toBeVisible();
  await koffi.context().close();
});

test("un PDF joint arrive chez l’autre membre et se télécharge", async ({ browser }) => {
  const koffi = await signIn(browser, "koffi");
  const sadio = await signIn(browser, "sadio");
  await koffi.getByRole("link", { name: /Sadio Diop/ }).click();
  await sadio.getByRole("link", { name: /Koffi Mensah/ }).click();

  const name = `specs-${Date.now()}.pdf`;
  await koffi.locator('input[type="file"]').setInputFiles({ name, mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.7\n1 0 obj\n<<>>\nendobj\n") });
  await expect(thread(koffi).getByRole("link", { name: new RegExp(name) })).toBeVisible();
  const card = thread(sadio).getByRole("link", { name: new RegExp(name) });
  await expect(card).toBeVisible({ timeout: 10_000 });
  // Fetched by Sadio's browser, with his session: the file is served as a PDF.
  const href = (await card.getAttribute("href"))!;
  const [status, type] = await sadio.evaluate((u) => fetch(u).then((r) => [r.status, r.headers.get("content-type")]), href);
  expect(status).toBe(200);
  expect(type).toBe("application/pdf");

  await koffi.context().close();
  await sadio.context().close();
});

test("en anglais, l’erreur de connexion arrive en anglais", async ({ page }) => {
  await page.goto("/en/connexion");
  await page.getByLabel("E-mail").fill(EMAIL.koffi.email);
  await page.getByLabel("Password", { exact: true }).fill("wrong-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("Incorrect email or password.")).toBeVisible();
});
