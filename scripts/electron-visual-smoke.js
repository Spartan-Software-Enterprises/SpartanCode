const fs = require("fs");
const path = require("path");
const { _electron: electron } = require("playwright");

const outputDir =
  process.env.SPARTANCODE_VISUAL_OUTPUT || "/tmp/spartancode-visual";
fs.mkdirSync(outputDir, { recursive: true });

async function main() {
  const errors = [];
  const warnings = [];
  const app = await electron.launch({
    executablePath: require("electron"),
    args: [path.resolve(__dirname, "..")],
    env: { ...process.env, ELECTRON_IS_DEV: "0" },
  });
  const page = await app.firstWindow();
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
    await page.locator(`[data-view="${view}"].active`).waitFor();
    if (view === "settings") {
      await page
        .locator("#settingsRuntimeStatus .settings-runtime-item")
        .first()
        .waitFor();
      await page
        .locator("#settingsGovernanceStatus .settings-runtime-item")
        .first()
        .waitFor();
      await page.locator(".settings-card").evaluate((element) => {
        element.scrollTop = 0;
      });
    }
    await page.screenshot({
      path: path.join(outputDir, `desktop-${view}.png`),
      fullPage: true,
    });
    if (view === "settings") {
      await page.locator(".settings-card").evaluate((element) => {
        element.scrollTop = element.scrollHeight;
      });
      await page.screenshot({
        path: path.join(outputDir, "desktop-settings-governance.png"),
        fullPage: true,
      });
      await page.locator(".settings-card").evaluate((element) => {
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

main().catch((error) => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
