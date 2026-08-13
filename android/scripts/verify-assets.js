#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");

const expected = ["command-center.png", "mission-queued.png"];
const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const assets = expected.map((name) => {
  const filePath = path.join(__dirname, "..", "screenshots", name);
  const bytes = fs.readFileSync(filePath);
  if (!bytes.subarray(0, 8).equals(pngSignature))
    throw new Error(`${name} is not a PNG`);
  const width = bytes.readUInt32BE(16);
  const height = bytes.readUInt32BE(20);
  if (width !== 780 || height !== 1688)
    throw new Error(`${name} must be 780x1688, received ${width}x${height}`);
  return { name, width, height, bytes: bytes.length };
});

console.log(JSON.stringify({ checked: assets.length, assets }));
