import { chromium, expect } from "@playwright/test";
import { writeFile } from "node:fs/promises";
const browser = await chromium.launch({
  executablePath:
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } }),
  errors: string[] = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto("http://127.0.0.1:4310/switchboard");
await expect(page.getByText("Synthetic test account")).toBeVisible();
await page.screenshot({ path: "docs/evidence/switchboard-login.png" });
await page.getByRole("button", { name: /Enter workspace/ }).click();
await expect(
  page.getByRole("heading", { name: /Switch the route/ }),
).toBeVisible();
if (process.argv.includes("--run")) {
  await page.getByLabel("Subscribers per experiment").selectOption("5,20,50");
  await page.getByLabel("Operations per experiment").fill("8");
  await page.getByLabel("Writes per second").fill("8");
  await page.getByLabel("Latency objective (ms)", { exact: true }).fill("1200");
  await page
    .getByRole("button", { name: "Run real experiment", exact: true })
    .click();
  await expect(page).toHaveURL(/switchboard\/runs\//);
  console.log(
    "Browser configured and started full 5/20/50 paired matrix: " + page.url(),
  );
  await expect(page.locator(".switch-verdict strong")).toHaveText(
    /^(pass|inconclusive)$/,
    { timeout: 730000 },
  );
  const id = new URL(page.url()).pathname.split("/")[3];
  const bundle = await (
    await page.request.get(
      "http://127.0.0.1:4310/api/switchboard/" + id + "/export",
    )
  ).json();
  expect(bundle.experiments.length).toBe(20);
  expect(
    bundle.experiments.every((e: any) => e.summary.metrics.unauthorized === 0),
  ).toBe(true);
  await writeFile(
    "docs/evidence/switchboard-scoped-baseline-full.json",
    JSON.stringify(bundle, null, 2),
  );
  console.log(
    JSON.stringify({
      id,
      result: bundle.run.verdict.result,
      experiments: bundle.experiments.length,
      receipts: bundle.receipts.length,
    }),
  );
} else
  await page
    .getByRole("button", { name: /scoped · baseline/ })
    .first()
    .click();
await expect(page.getByText("THE RECEIPT ROOM")).toBeVisible();
await page
  .getByRole("button", { name: "Replay evidence", exact: true })
  .click();
await expect(page.getByText(/RECORDED EVIDENCE PLAYBACK/)).toBeVisible();
await page
  .getByRole("button", { name: "Pause recorded events", exact: true })
  .click();
await page
  .getByRole("slider", { name: "Recorded operation", exact: true })
  .fill("1");
await page.screenshot({
  path: "docs/evidence/switchboard-desktop.png",
  fullPage: true,
});
const downloadPromise = page.waitForEvent("download");
await page
  .getByRole("link", { name: "Export raw bundle", exact: true })
  .click();
const download = await downloadPromise;
expect(download.suggestedFilename()).toMatch(/^switchboard-/);
const sourceURL = page.url();
const sourceId = new URL(sourceURL).pathname.split("/")[3];
const sourceBundle = await (
  await page.request.get("http://127.0.0.1:4310/api/switchboard/" + sourceId)
).json();
await page.getByRole("button", { name: "New project", exact: true }).click();
await page.getByLabel("Project name").fill("Switchboard browser " + Date.now());
await page.getByRole("button", { name: "Create project", exact: true }).click();
await expect(page).toHaveURL("http://127.0.0.1:4310/switchboard");
await expect(
  page.getByRole("combobox", { name: "Project", exact: true }),
).not.toHaveValue(sourceBundle.run.project_id);
const createdProject = await page
  .getByRole("combobox", { name: "Project", exact: true })
  .inputValue();
expect(createdProject).not.toBe(sourceBundle.run.project_id);
await page.goto(sourceURL);
await expect(
  page.getByRole("combobox", { name: "Project", exact: true }),
).toHaveValue(sourceBundle.run.project_id);
await page
  .getByRole("combobox", { name: "Project", exact: true })
  .selectOption(createdProject);
await expect(page).toHaveURL("http://127.0.0.1:4310/switchboard");
await page.goto(sourceURL);
await expect(
  page.getByRole("combobox", { name: "Project", exact: true }),
).toHaveValue(sourceBundle.run.project_id);
await page.setViewportSize({ width: 390, height: 844 });
await expect(
  page.getByRole("heading", { name: /Switch the route/ }),
).toBeVisible();
const overflow = await page.evaluate(
  () => document.documentElement.scrollWidth > innerWidth + 1,
);
expect(overflow).toBe(false);
await page.screenshot({
  path: "docs/evidence/switchboard-mobile.png",
  fullPage: true,
});
expect(errors).toEqual([]);
await writeFile(
  "docs/evidence/switchboard-browser.json",
  JSON.stringify(
    {
      desktop: true,
      mobile: true,
      recordedPlayback: true,
      projectCreation: true,
      deepLinkProjectRestoration: true,
      projectSwitching: true,
      export: true,
      overflow,
      errors,
    },
    null,
    2,
  ),
);
await browser.close();
console.log(
  "Switchboard browser: authenticated route, real evidence, playback, export, desktop/mobile passed.",
);
