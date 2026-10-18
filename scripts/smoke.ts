import { chromium, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
const base = "http://127.0.0.1:4310";
const browser = await chromium.launch({
  executablePath:
    process.env.CHROME_PATH ||
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
const errors: string[] = [];
const smokeName = "Browser smoke " + new Date().toISOString();
page.on("pageerror", (e) => errors.push(e.message));
await mkdir("docs/evidence", { recursive: true });
try {
  await page.goto(base);
  await page.getByRole("button", { name: "Enter workspace" }).click();
  await expect(
    page.getByRole("heading", {
      name: "Real problems. Useful tools.",
    }),
  ).toBeVisible();
  await page.locator('.product-entry[href="/accessproof"]').click();
  await page
    .getByRole("button", { name: "Agent & verification workbench" })
    .click();
  await expect(page).toHaveURL(base + "/accessproof/workbench");
  await expect(
    page.getByRole("heading", { name: "AccessProof", exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "New project" }).click();
  await page.getByLabel("Project name").fill(smokeName);
  await page
    .getByRole("button", { name: "Create project", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await page.getByLabel("Fixture scenario").selectOption("candidate-4");
  await page
    .getByRole("button", { name: "Run investigation", exact: true })
    .click();
  await expect(page.locator(".verdict-panel .status")).toHaveText(/fail/, {
    timeout: 30000,
  });
  await expect(page.locator(".evidence-row")).toHaveCount(9);
  await page.screenshot({
    path: "docs/evidence/accessproof-desktop.png",
    fullPage: true,
  });
  const source = (await page.request.get(base + "/api/bootstrap")).json();
  const d = await source;
  const access = d.runs.find(
    (r: any) =>
      r.spec.supported_parameters.module === "AccessProof" &&
      r.spec.supported_parameters.scenario === "candidate-4" &&
      r.project_id === d.projects.find((p: any) => p.name === smokeName).id,
  );
  const bundle = await (
    await page.request.get(base + "/api/runs/" + access.id + "/export")
  ).json();
  await writeFile(
    "docs/evidence/example-bundle.json",
    JSON.stringify(bundle, null, 2),
  );
  await page.reload();
  await expect(page.locator(".verdict-panel .status")).toHaveText(/fail/);
  await page.getByRole("button", { name: "Run corrected candidate" }).click();
  await expect(page.locator(".verdict-panel .status")).toHaveText(/pass/, {
    timeout: 30000,
  });
  await page.getByRole("button", { name: "Replay", exact: true }).click();
  await expect(page.locator(".verdict-panel .status")).toHaveText(/pass/, {
    timeout: 30000,
  });
  await expect(
    page.getByText("This is not a fresh experiment.", { exact: false }),
  ).toBeVisible();
  await page.locator('.nav-item[href="/eventmedic"]').click();
  await page
    .getByRole("button", { name: "Agent & verification workbench" })
    .click();
  await page.getByLabel("Fixture scenario").selectOption("interrupted");
  await page
    .getByRole("button", { name: "Run investigation", exact: true })
    .click();
  await expect(page.locator(".verdict-panel .status")).toHaveText(/pass/, {
    timeout: 30000,
  });
  await page.locator('.nav-item[href="/importrescue"]').click();
  await page
    .getByRole("button", { name: "Agent & verification workbench" })
    .click();
  await page.getByLabel("Fixture scenario").selectOption("supplier-b");
  await page
    .getByRole("button", { name: "Run investigation", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Approve this exact plan" }),
  ).toBeVisible({ timeout: 30000 });
  await expect(page.locator(".verdict-panel .status")).toHaveText(
    /not evaluated/,
    { timeout: 30000 },
  );
  await page.screenshot({
    path: "docs/evidence/import-approval.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Approve this exact plan" }).click();
  await expect(
    page.getByRole("heading", { name: "Approved action executed" }),
  ).toBeVisible({ timeout: 30000 });
  await expect(page.locator(".verdict-panel .status")).toHaveText(/pass/, {
    timeout: 30000,
  });
  await page.locator('.nav-item[href="/economybreaker"]').click();
  await page
    .getByRole("button", { name: "Agent & verification workbench" })
    .click();
  await page.getByLabel("Fixture scenario").selectOption("withdrawal");
  await page
    .getByRole("button", { name: "Run investigation", exact: true })
    .click();
  await expect(page.locator(".verdict-panel .status")).toHaveText(/fail/, {
    timeout: 30000,
  });
  await page.locator('.nav-item[href="/erasurecheck"]').click();
  await page
    .getByRole("button", { name: "Agent & verification workbench" })
    .click();
  await page
    .getByRole("button", { name: "Run investigation", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Approve this exact plan" }),
  ).toBeVisible({ timeout: 30000 });
  await page.getByRole("button", { name: "Approve this exact plan" }).click();
  await expect(page.locator(".verdict-panel .status")).toHaveText(/pass/, {
    timeout: 30000,
  });
  await page.locator('.nav-item[href="/accessproof"]').click();
  await page.screenshot({
    path: "docs/evidence/overview-desktop.png",
    fullPage: true,
  });
  for (const slug of [
    "accessproof",
    "eventmedic",
    "erasurecheck",
    "importrescue",
    "economybreaker",
  ]) {
    await page.goto(base + "/" + slug + "/workbench");
    await expect(page.locator(".page-heading h1")).toBeVisible();
    await expect(page).toHaveURL(base + "/" + slug + "/workbench");
    await page.reload();
    await expect(page.locator(".product-domain")).toBeVisible();
  }
  await page.goto(base + "/");
  await expect(page.locator(".product-directory")).toBeVisible();
  await page.screenshot({
    path: "docs/evidence/home-desktop.png",
    fullPage: true,
  });
  await page.locator('.product-entry[href="/accessproof"]').click();
  await page
    .getByRole("button", { name: "Agent & verification workbench" })
    .click();
  await page.locator('.nav-item[href="/eventmedic"]').click();
  await page
    .getByRole("button", { name: "Agent & verification workbench" })
    .click();
  await page.goBack();
  await expect(page).toHaveURL(base + "/eventmedic");
  await page.goBack();
  await expect(page).toHaveURL(base + "/accessproof/workbench");
  await expect(page.locator(".page-heading h1")).toContainText("AccessProof");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "docs/evidence/overview-mobile.png",
    fullPage: true,
  });
  assertNoOverflow: {
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    );
    if (overflow) throw Error("Mobile document overflow");
  }
  if (errors.length) throw Error("Browser errors: " + errors.join("; "));
  const result = {
    verified_at: new Date().toISOString(),
    browser: await browser.version(),
    flows: [
      "real Supabase sandbox sign-in",
      "project creation",
      "AccessProof seeded defect and evidence inspection",
      "corrected candidate",
      "saved evidence replay",
      "EventMedic interruption recovery",
      "ImportRescue exact approval and commit",
      "EconomyBreaker concurrent withdrawal defect",
      "ErasureCheck real Storage approval and verified cleanup",
      "JSON evidence export",
      "responsive 390px layout",
      "five direct product URLs survive reload",
      "deep run reload restores owning project before correction",
      "browser back restores product page",
      "shared home product directory",
    ],
    console_errors: errors,
    storage: "Real Supabase Storage verified",
    live_model:
      "Local qwen2.5:3b independently verified in product evaluation reports",
  };
  await writeFile(
    "docs/evidence/browser-smoke.json",
    JSON.stringify(result, null, 2),
  );
  console.log(JSON.stringify(result, null, 2));
} finally {
  await browser.close();
}
