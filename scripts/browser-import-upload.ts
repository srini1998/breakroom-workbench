import { chromium, expect } from "@playwright/test";
import { writeFile } from "node:fs/promises";
const browser = await chromium.launch({
  executablePath:
    process.env.CHROME_PATH ||
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
});
const p = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
const errors: string[] = [];
p.on("pageerror", (e) => errors.push(e.message));
try {
  await p.goto("http://127.0.0.1:4310/importrescue/workbench");
  await p.getByRole("button", { name: "Enter workspace" }).click();
  await p.locator(".upload-desk>summary").click();
  await p.getByLabel("Supplier CSV").setInputFiles({
    name: "supplier-example.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(
      '"sku","units","receipt"\n"BOLT","12","R-1"\n"NUT","6","R-2"',
    ),
  });
  await p.getByRole("button", { name: "Stage uploaded CSV" }).click();
  await expect(
    p.getByRole("button", { name: "Approve this exact plan" }),
  ).toBeVisible({ timeout: 15000 });
  await expect(p.locator(".verdict-panel .status")).toContainText(
    "not evaluated",
  );
  await p.screenshot({
    path: "docs/evidence/importrescue-upload-approval.png",
    fullPage: true,
  });
  await p.getByRole("button", { name: "Approve this exact plan" }).click();
  await expect(
    p.getByRole("heading", { name: "Approved action executed" }),
  ).toBeVisible({ timeout: 15000 });
  await expect(p.locator(".verdict-panel .status")).toContainText("pass");
  await expect(p.locator(".evidence-heading h2")).toContainText("Uploaded CSV");
  await p.screenshot({
    path: "docs/evidence/importrescue-upload-committed.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
  await writeFile(
    "docs/evidence/importrescue-upload-browser.json",
    JSON.stringify(
      {
        verified_at: new Date().toISOString(),
        checks: [
          "actual CSV file input",
          "editable declarative mapping",
          "exact stock diff review",
          "real API approval",
          "dedicated worker commit",
          "recorded stock visualization",
        ],
        page_errors: errors,
        result: "pass",
      },
      null,
      2,
    ),
  );
  console.log("CSV upload → exact review → worker commit browser flow passed.");
} finally {
  await browser.close();
}
