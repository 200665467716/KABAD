import { expect, test } from "@playwright/test";
import { salonsEnabled } from "../src/lib/features";

/* Every screen loads without error and without horizontal scrolling, on phone and on computer. */
const PUBLIC = ["/", "/inscription", "/connexion", "/mot-de-passe-oublie", "/soutenir/api-mobile-money"];
const SIGNED_IN = [
  "/accueil",
  "/notifications",
  "/membres",
  "/membres?role=senior&tech=TypeScript",
  "/compte",
  "/profil/awa",
  "/profil/kossi",
  "/inscription/profil",
  "/inscription/recommandations",
  "/mentorat",
  "/mentorat/mentors",
  "/mentorat/demande/nadia",
  "/mentorat/seances/s3",
  "/mentorat/seances/nouvelle?binome=awa-kossi",
  "/capsules",
  "/capsules/webhook-deux-fois",
  "/defis",
  "/defis/api-mobile-money",
  "/defis/inscription-accessible/resultats",
  "/tests",
  "/tests/marche-vert",
  "/tests/sante-direct/rapport",
  "/tests/nouveau",
  ...(salonsEnabled ? ["/salons", "/salons/salon-entretiens", "/salons/nouveau"] : []),
  "/messages",
  "/messages?onglet=invitations",
  "/messages/groupes/nouveau",
];

async function check(page: import("@playwright/test").Page, route: string, signedIn = false) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error" && /hydrat/i.test(m.text())) errors.push(m.text().slice(0, 2000));
  });
  const res = await page.goto(route);
  expect(res?.status()).toBe(200);
  if (signedIn) expect(new URL(page.url()).pathname).not.toBe("/connexion");
  await expect(page.getByRole("heading", { name: "Page introuvable" })).toHaveCount(0);
  await expect(page.locator("h1").first()).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  expect(errors).toEqual([]);
}

test.describe("écrans publics", () => {
  test.use({ storageState: { cookies: [], origins: [] } });
  for (const route of PUBLIC) test(`${route} s’affiche`, ({ page }) => check(page, route));
});

test.describe("écrans du membre connecté", () => {
  test.use({ storageState: "e2e/.auth/kossi.json" });
  for (const route of SIGNED_IN) test(`${route} s’affiche`, ({ page }) => check(page, route, true));

  test("les pages de l’équipe n’existent pas pour un membre", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: "Page introuvable" })).toBeVisible();
  });

  test("les salons vocaux désactivés n’apparaissent nulle part", async ({ page, request }) => {
    test.skip(salonsEnabled, "Salons vocaux activés (NEXT_PUBLIC_SALONS=on).");
    await page.goto("/salons");
    await expect(page.getByRole("heading", { name: "Page introuvable" })).toBeVisible();
    await page.goto("/accueil");
    await expect(page.getByRole("link", { name: /Salons vocaux/ })).toHaveCount(0);
    expect((await request.get("/api/rooms")).status()).toBe(404);
  });
});
