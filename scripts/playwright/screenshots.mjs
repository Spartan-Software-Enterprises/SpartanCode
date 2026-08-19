import { chromium } from "playwright";
import { mkdirSync } from "fs";

const WIDTHS = [
  { name: "desktop", w: 1440, h: 900 },
  { name: "landscape-phone", w: 915, h: 412 },
  { name: "mobile", w: 412, h: 892 },
  { name: "television", w: 1920, h: 1080 },
];

const PAGES = [
  { name: "chat", url: "file:///home/ubuntu/workspaces/SpartanCode/android/screenshots/html/chat.html" },
  { name: "missions", url: "file:///home/ubuntu/workspaces/SpartanCode/android/screenshots/html/missions.html" },
  { name: "models", url: "file:///home/ubuntu/workspaces/SpartanCode/android/screenshots/html/models.html" },
  { name: "settings", url: "file:///home/ubuntu/workspaces/SpartanCode/android/screenshots/html/settings.html" },
];

const OUT = "android/screenshots";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ args: ["--no-sandbox"] });
let total = 0;
let passed = 0;

for (const page_def of PAGES) {
  for (const vp of WIDTHS) {
    total++;
    const ctx = await browser.newContext({
      viewport: { width: vp.w, height: vp.h },
      deviceScaleFactor: vp.w >= 1920 ? 2 : 1,
    });
    const page = await ctx.newPage();
    try {
      await page.goto(page_def.url, { waitUntil: "networkidle", timeout: 15000 });
      await page.waitForTimeout(300);
      const slug = `${OUT}/${page_def.name}-${vp.name}.png`;
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
console.log(`\n${passed}/${total} screenshots captured.`);
if (passed < total) process.exit(1);
