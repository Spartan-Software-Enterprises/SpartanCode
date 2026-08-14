const http = require("http");
const assert = require("node:assert/strict");
const { createBrowserAutomation } = require("../src/main/browser-automation");

async function main() {
  const server = http.createServer((_request, response) => {
    response.writeHead(200, { "content-type": "text/html" });
    response.end(
      "<main><h1>SpartanCode browser smoke</h1><p>verified</p></main>",
    );
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  try {
    const browser = createBrowserAutomation({
      playwright: require("playwright"),
      environment: { SPARTANCODE_BROWSER_ALLOWLIST: "127.0.0.1" },
    });
    assert.equal(browser.status().status, "available");
    const result = await browser.run({
      url: `http://127.0.0.1:${port}/`,
      action: "extractText",
      selector: "main",
    });
    assert.equal(result.ok, true);
    assert.match(result.text, /SpartanCode browser smoke/);
    console.log(JSON.stringify({ status: browser.status(), result }, null, 2));
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

main().catch((error) => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
