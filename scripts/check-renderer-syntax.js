const fs = require("fs");
const vm = require("vm");

const source = fs.readFileSync("src/renderer/index.html", "utf8");
const match = source.match(/<script>([\s\S]*?)<\/script>/);
if (!match) throw new Error("Renderer script tag not found");

new vm.Script(match[1], { filename: "src/renderer/index.html<script>" });
console.log("Renderer script syntax is valid");
