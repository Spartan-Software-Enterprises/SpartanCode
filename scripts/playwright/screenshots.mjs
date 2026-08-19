import { chromium } from "playwright";
import { mkdirSync } from "fs";

const WIDTHS = [
  { name: "desktop", w: 1440, h: 900 },
  { name: "landscape-phone", w: 915, h: 412 },
  { name: "mobile", w: 412, h: 892 },
  { name: "television", w: 1920, h: 1080 },
];

const PAGES = [
  { name: "index", url: "file:///home/ubuntu/workspaces/SpartanCode/src/renderer/index.html" },
];

mkdirSync("docs/screenshots", { recursive: true });

const browser = await chromium.launch({ args: ["--no-sandbox"] });
let total = 0;
let passed = 0;

for (const page_def of PAGES) {
  for (const vp of WIDTHS) {
    total++;
    const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h } });
    const page = await ctx.newPage();
    try {
      await page.goto(page_def.url, { waitUntil: "networkidle", timeout: 15000 });
      await page.waitForTimeout(500);
      const slug = "docs/screenshots/" + page_def.name + "-" + vp.name + "-" + vp.w + "x" + vp.h + ".png";
      await page.screenshot({ path: slug, fullPage: false });
      console.log("PASS", slug);
      passed++;
    } catch (e) {
      console.error("FAIL", page_def.name, vp.name, e.message);
    }
    await ctx.close();
  }
}

await browser.close();
console.log("\n" + passed + "/" + total + " screenshots captured.");
if (passed < total) process.exit(1);
