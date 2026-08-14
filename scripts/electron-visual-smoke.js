const fs = require("fs");
const path = require("path");
const { _electron: electron } = require("playwright");

const outputDir =
  process.env.SPARTANCODE_VISUAL_OUTPUT || "/tmp/spartancode-visual";
const VISUAL_TIMEOUT_MS = 4 * 60 * 1000;
fs.mkdirSync(outputDir, { recursive: true });

async function main() {
  const errors = [];
  const warnings = [];
  const app = await electron.launch({
    executablePath: require("electron"),
    args: [path.resolve(__dirname, "..")],
    env: { ...process.env, ELECTRON_IS_DEV: "0" },
    timeout: 60_000,
  });
  const page = await app.firstWindow();
  page.setDefaultTimeout(15_000);
  page.setDefaultNavigationTimeout(15_000);
  page.on("pageerror", (error) => errors.push(String(error)));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
    if (message.type() === "warning") warnings.push(message.text());
  });

  await page.waitForSelector(".app");
  await page.screenshot({
    path: path.join(outputDir, "desktop-home.png"),
    fullPage: true,
  });
  const title = await page.title();
  const identity = await page.locator(".brand").innerText();
  if (!title.includes("SpartanCode") || !identity.includes("SpartanCode")) {
    throw new Error(`Unexpected page identity: ${title} / ${identity}`);
  }

  const views = ["home", "projects", "agents", "artifacts", "settings"];
  for (const view of views) {
    await page.locator(`[data-view="${view}"]`).click();
    const activeNavItem = page.locator(`[data-view="${view}"].active`);
    await activeNavItem.waitFor({ state: "attached" });
    if (
      !(await activeNavItem.evaluate((element) =>
        element.classList.contains("active"),
      ))
    ) {
      throw new Error(`Navigation item did not become active: ${view}`);
    }
    if (view === "settings") {
      await page
        .locator("#settingsRuntimeStatus .settings-runtime-item")
        .first()
        .waitFor();
      await page
        .locator("#settingsGovernanceStatus .settings-runtime-item")
        .first()
        .waitFor();
      await page.locator("#settingsForm").evaluate((element) => {
        element.scrollTop = 0;
      });
    }
    await page.screenshot({
      path: path.join(outputDir, `desktop-${view}.png`),
      fullPage: true,
    });
    if (view === "settings") {
      await page.locator("#settingsForm").evaluate((element) => {
        element.scrollTop = element.scrollHeight;
      });
      await page.screenshot({
        path: path.join(outputDir, "desktop-settings-governance.png"),
        fullPage: true,
      });
      for (const [label, filename] of [
        ["Collaboration sessions", "desktop-settings-collaboration.png"],
        ["Signed plugin marketplace", "desktop-settings-marketplace.png"],
      ]) {
        const section = page.locator("#settingsForm details", {
          hasText: label,
        });
        await section.locator("summary").click();
        await page.screenshot({
          path: path.join(outputDir, filename),
          fullPage: true,
        });
      }
      await page.locator("#settingsForm").evaluate((element) => {
        element.scrollTop = 0;
      });
    }
    const managerClose = page.locator('[aria-label="Close agent manager"]');
    if (await managerClose.isVisible().catch(() => false))
      await managerClose.click({ force: true });
    const settingsClose = page.locator("#closeSettings");
    if (await settingsClose.isVisible().catch(() => false))
      await settingsClose.click({ force: true });
  }

  await page.locator('[data-view="home"]').click();
  const input = page.locator("#missionInput");
  await input.fill("Create a visual smoke-test mission");
  if ((await input.inputValue()) !== "Create a visual smoke-test mission") {
    throw new Error("Mission composer did not retain input");
  }
  await page.screenshot({
    path: path.join(outputDir, "desktop-composer-filled.png"),
    fullPage: true,
  });

  await page.locator('.round-button[aria-label="Notifications"]').click();
  await page.locator("#chatModal.open").waitFor();
  await page.screenshot({
    path: path.join(outputDir, "desktop-menu-assistant.png"),
    fullPage: true,
  });
  await page.locator("#closeChat").click();

  await page.locator("#openPreview").click();
  await page.locator("#previewModal.open").waitFor();
  await page.locator("#previewUrl").fill("https://example.com");
  await page.locator("#previewForm").locator("button[type=submit]").click();
  const previewMessage = await page.locator("#previewMessage").innerText();
  if (!previewMessage.includes("local development")) {
    throw new Error("Preview security guard did not reject a public URL");
  }
  await page.screenshot({
    path: path.join(outputDir, "desktop-preview-dialog.png"),
    fullPage: true,
  });
  await page.locator("#closePreview").click();

  const result = {
    title,
    identity,
    views,
    errors,
    warnings,
    screenshots: fs.readdirSync(outputDir).sort(),
  };
  fs.writeFileSync(
    path.join(outputDir, "result.json"),
    JSON.stringify(result, null, 2),
  );
  await app.close();
  if (errors.length) throw new Error(`Renderer errors: ${errors.join("; ")}`);
  console.log(JSON.stringify(result, null, 2));
}

const watchdog = setTimeout(() => {
  console.error(`Visual smoke exceeded ${VISUAL_TIMEOUT_MS / 1000}s`);
  process.exit(1);
}, VISUAL_TIMEOUT_MS);
watchdog.unref();

main()
  .catch((error) => {
    console.error(error.stack || error);
    process.exitCode = 1;
  })
  .finally(() => clearTimeout(watchdog));
