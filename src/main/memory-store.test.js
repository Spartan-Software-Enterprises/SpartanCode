const test = require("node:test");
const assert = require("node:assert/strict");
const { createMemoryStore } = require("./memory-store");

function fakeVault() {
  let value = null;
  return {
    status: () => ({ available: true, provider: "test vault" }),
    get: () => value,
    set: (_name, next) => (value = next),
    delete: () => {
      value = null;
      return true;
    },
    raw: () => value,
  };
}

test("memory store persists encrypted-vector entries and searches by similarity", () => {
  const vault = fakeVault();
  const memory = createMemoryStore({ secureVault: vault });
  memory.add({
    content: "Prefer dark Spartan IDE colors",
    tags: ["preference"],
  });
  memory.add({ content: "Use Leo as the default commander", tags: ["agent"] });
  assert.equal(memory.status().entries, 2);
  assert.match(vault.raw(), /vector/);
  assert.equal(
    memory.search("dark IDE theme")[0].content,
    "Prefer dark Spartan IDE colors",
  );
});

test("memory store refuses secret-like content and supports deletion", () => {
  const memory = createMemoryStore({ secureVault: fakeVault() });
  assert.throws(
    () => memory.add({ content: "OPENAI_API_KEY=do-not-index" }),
    /Secret-like/,
  );
  const entry = memory.add({ content: "Keep Android standalone" });
  assert.equal(memory.delete(entry.id), true);
  assert.equal(memory.list().length, 0);
});

test("memory store fails closed when OS encryption is unavailable", () => {
  const vault = {
    status: () => ({ available: false }),
    get() {},
    set() {},
    delete() {},
  };
  const memory = createMemoryStore({ secureVault: vault });
  assert.throws(
    () => memory.add({ content: "local preference" }),
    /secure storage/,
  );
});
