import { chromium, expect } from "@playwright/test";
import { writeFile } from "node:fs/promises";
const browser = await chromium.launch({
  executablePath:
    process.env.CHROME_PATH ||
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } }),
  errors: string[] = [],
  checks: any[] = [];
page.on("pageerror", (e) => errors.push(e.message));
try {
  await page.goto("http://127.0.0.1:4310/");
  await page.getByRole("button", { name: "Enter workspace" }).click();
  await expect(
    page.locator(".product-directory .product-entry").first(),
  ).toHaveAttribute("href", "/switchboard");
  await page.screenshot({
    path: "docs/evidence/practical-home.png",
    fullPage: true,
  });
  for (const slug of [
    "switchboard",
    "accessproof",
    "eventmedic",
    "erasurecheck",
    "importrescue",
    "economybreaker",
  ]) {
    await page.goto("http://127.0.0.1:4310/" + slug);
    await expect(page.locator(".purpose-lead h1")).toBeVisible();
    if (slug === "switchboard") {
      await expect(page.locator(".quake-card")).toHaveCount(6);
      await expect(page.locator(".technical-drawer")).not.toHaveAttribute(
        "open",
        "",
      );
      await page
        .getByRole("button", {
          name: /Check delivery using these observations/,
        })
        .click();
      await expect(page.getByLabel("Update content")).toHaveValue(
        "earthquakes",
      );
      await page.locator(".technical-drawer>summary").click();
    } else {
      await page
        .getByRole("button", { name: /New example|Open example workspace/ })
        .click();
      if (slug === "accessproof") {
        await page.getByLabel("Preview colleague").selectOption("member");
        await page
          .getByRole("button", { name: "Review local copy", exact: true })
          .first()
          .click();
        await expect(page.locator(".business-outcome strong")).toHaveText(
          "Request blocked",
        );
        await page.getByLabel("Preview colleague").selectOption("contractor");
        await expect(page.locator(".issue-ticket")).toHaveCount(1);
        await page
          .getByRole("button", { name: /Try opening the other team/ })
          .click();
        await expect(page.locator(".business-outcome strong")).toHaveText(
          "Request blocked",
        );
      }
      if (slug === "eventmedic") {
        await page
          .getByRole("button", {
            name: "Check out one bike locally",
            exact: true,
          })
          .click();
        await expect(
          page.getByRole("button", { name: "Return that bike", exact: true }),
        ).toBeEnabled();
        await page
          .getByRole("button", {
            name: "Resend that same checkout",
            exact: true,
          })
          .click();
        await expect(page.locator(".business-outcome strong")).toContainText(
          "Repeated delivery",
        );
        await page
          .getByRole("button", { name: "Return that bike", exact: true })
          .click();
        await expect(page.locator(".business-outcome strong")).toContainText(
          "Return saved",
        );
      }
      if (slug === "erasurecheck") {
        await page
          .getByRole("button", {
            name: "Prepare an account closure plan",
            exact: true,
          })
          .click();
        await page
          .getByRole("button", {
            name: "Approve and close this example account",
            exact: true,
          })
          .click();
        await expect(page.locator(".business-outcome strong")).toHaveText(
          "Account closure verified",
        );
      }
      if (slug === "importrescue") {
        await page
          .getByRole("button", {
            name: "Load real UCI sales sample",
            exact: true,
          })
          .click();
        await page
          .getByRole("button", {
            name: "Check and preview this file",
            exact: true,
          })
          .click();
        await expect(page.locator(".approval-plan h3")).toContainText(
          "24 rows",
        );
        await page
          .getByRole("button", {
            name: "Approve this exact import",
            exact: true,
          })
          .click();
        await expect(page.locator(".business-outcome strong")).toHaveText(
          "Import saved",
        );
      }
      if (slug === "economybreaker") {
        await page
          .getByRole("button", {
            name: "Send two crafting requests together",
            exact: true,
          })
          .click();
        await expect(
          page.getByRole("button", {
            name: "Send a block to the teammate",
            exact: true,
          }),
        ).toBeEnabled();
        await page
          .getByRole("button", {
            name: "Send a block to the teammate",
            exact: true,
          })
          .click();
        await expect(page.locator(".business-outcome")).toContainText(
          "9 ingot-equivalents",
        );
      }
      await expect(page.locator(".purpose-sidebar")).toBeVisible();
      await expect(page.locator(".overview-intro")).toHaveCount(0);
    }
    await page.screenshot({
      path: `docs/evidence/practical-${slug}-desktop.png`,
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth + 1,
    );
    expect(overflow, slug + " mobile overflow").toBe(false);
    await page.screenshot({
      path: `docs/evidence/practical-${slug}-mobile.png`,
      fullPage: true,
    });
    checks.push({
      slug,
      real_source: true,
      practical_workflow: true,
      mobile_overflow: overflow,
    });
    await page.setViewportSize({ width: 1440, height: 1000 });
  }
  await page.goto("http://127.0.0.1:4310/product-fit");
  await expect(
    page.getByRole("heading", { name: /Will this permission change/ }),
  ).toBeVisible();
  const download = page.waitForEvent("download");
  await page
    .getByRole("link", {
      name: "Download the tested starter contract",
      exact: true,
    })
    .click();
  expect((await download).suggestedFilename()).toBe("team-isolation.json");
  await page.screenshot({
    path: "docs/evidence/practical-product-fit.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
  await writeFile(
    "docs/evidence/practical-browser.json",
    JSON.stringify(
      {
        verified_at: new Date().toISOString(),
        switchboard_first: true,
        checks,
        product_fit_download: true,
        page_errors: errors,
      },
      null,
      2,
    ),
  );
  console.log(
    "All six practical pages: actual source records, working actions, desktop/mobile bounds, technical separation and product-fit download passed.",
  );
} finally {
  await browser.close();
}
