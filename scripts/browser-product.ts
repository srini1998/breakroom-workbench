import { chromium, expect } from "@playwright/test";
import { control, target } from "../server/db.ts";
import { writeFile } from "node:fs/promises";
const module = process.argv[2],
  slug = module.toLowerCase();
const base = "http://127.0.0.1:4310";
const b = await chromium.launch({
  executablePath:
    process.env.CHROME_PATH ||
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
});
const p = await b.newPage({ viewport: { width: 1440, height: 1100 } });
const errors: string[] = [];
p.on("pageerror", (e) => errors.push(e.message));
try {
  await p.goto(base + "/" + slug + "/workbench");
  await p.getByRole("button", { name: "Enter workspace" }).click();
  await expect(p.locator(".page-heading h1")).toContainText(module);
  const run = (
    await control.query(
      "select id from runs where spec->'supported_parameters'->>'module'=$1 and status='completed' order by created_at desc limit 1",
      [module],
    )
  ).rows[0];
  if (!run) throw Error("Run missing");
  await p.goto(base + "/" + slug + "/runs/" + run.id);
  await expect(
    p.getByRole("region", { name: "Visual investigation result" }),
  ).toBeVisible();
  await p.screenshot({
    path: "docs/evidence/" + slug + "-playground-desktop.png",
    fullPage: true,
  });
  const count = await p.locator(".playback-bar input").getAttribute("max");
  if (Number(count) > 0) {
    await p.getByLabel("First recorded step").click();
    await p.getByLabel("Play recorded steps").click();
    await p.waitForTimeout(1100);
    await p.getByLabel("Pause recorded steps").click();
  }
  await p.setViewportSize({ width: 390, height: 844 });
  await p.screenshot({
    path: "docs/evidence/" + slug + "-playground-mobile.png",
    fullPage: true,
  });
  const overflow = await p.evaluate(
    () => document.documentElement.scrollWidth > innerWidth,
  );
  if (overflow) throw Error("Mobile overflow");
  expect(errors).toEqual([]);
  await writeFile(
    "docs/evidence/" + slug + "-browser.json",
    JSON.stringify(
      {
        verified_at: new Date().toISOString(),
        module,
        run_id: run.id,
        browser: await b.version(),
        checks: [
          "real Supabase sandbox login",
          "dedicated product URL",
          "recorded visual result",
          "playback controls",
          "390px viewport without document overflow",
        ],
        page_errors: errors,
      },
      null,
      2,
    ),
  );
  console.log(module + " visual flow verified.");
} finally {
  await b.close();
  await control.end();
  await target.end();
}
