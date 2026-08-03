"use strict";

const assert = require("assert");
const draft = require("../intake-draft.js");

function createStorage(records = new Map()) {
  return {
    records,
    setItem(key, value) { records.set(key, value); },
    getItem(key) { return records.get(key) || null; },
    removeItem(key) { records.delete(key); }
  };
}

const storage = createStorage();
const windowObject = { localStorage: storage };
const source = { elements: [
  { name: "contact_name", type: "text", value: "Alex Example" },
  { name: "budget", type: "select-one", value: "AUD $15,000-$40,000" },
  { name: "delivery_model", type: "radio", value: "Recommendation required", checked: true },
  { name: "delivery_model", type: "radio", value: "Customer-owned", checked: false },
  { name: "privacy_consent", type: "checkbox", checked: true },
  { name: "attachments", type: "file", value: "C:\\private\\brief.pdf", files: [
    { name: "private-client-name.pdf", size: 123 },
    { name: "commercial-plan.xlsx", size: 456 }
  ] },
  { name: "_honey", type: "text", value: "do-not-save" }
] };
const savedAt = new Date("2026-08-03T03:04:05.000Z");
assert.strictEqual(draft.save(windowObject, source, 7, savedAt), true);
const encoded = storage.records.get(draft.STORAGE_KEY);
assert(!encoded.includes("brief.pdf") && !encoded.includes("private-client-name") && !encoded.includes("commercial-plan") && !encoded.includes("do-not-save"));
const payload = JSON.parse(encoded);
assert.strictEqual(payload.schemaVersion, draft.SCHEMA_VERSION);
assert.strictEqual(payload.savedAt, savedAt.toISOString());
assert.strictEqual(payload.selectedFileCount, 2);

const target = { elements: [
  { name: "contact_name", type: "text", value: "" },
  { name: "budget", type: "select-one", value: "" },
  { name: "delivery_model", type: "radio", value: "Recommendation required", checked: false },
  { name: "delivery_model", type: "radio", value: "Customer-owned", checked: true },
  { name: "privacy_consent", type: "checkbox", checked: false },
  { name: "attachments", type: "file", value: "", files: [] }
] };
assert.deepStrictEqual(draft.restore(windowObject, target, 7), {
  currentStep: 7,
  savedAt: savedAt.toISOString(),
  selectedFileCount: 2
});
assert.strictEqual(target.elements[0].value, "Alex Example");
assert.strictEqual(target.elements[1].value, "AUD $15,000-$40,000");
assert.strictEqual(target.elements[2].checked, true);
assert.strictEqual(target.elements[3].checked, false);
assert.strictEqual(target.elements[4].checked, true);
assert.strictEqual(target.elements[5].value, "");
assert.strictEqual(draft.save(windowObject, target, 7, savedAt, 2), true);
assert.strictEqual(JSON.parse(storage.records.get(draft.STORAGE_KEY)).selectedFileCount, 2);

storage.records.set(draft.STORAGE_KEY, "not-json");
assert.strictEqual(draft.restore(windowObject, target, 7), null);
assert.strictEqual(storage.records.has(draft.STORAGE_KEY), false);
storage.records.set(draft.STORAGE_KEY, JSON.stringify({ schemaVersion: 1, answers: {} }));
assert.strictEqual(draft.restore(windowObject, target, 7), null);
assert.strictEqual(storage.records.has(draft.STORAGE_KEY), false);

assert.strictEqual(draft.save({ localStorage: { setItem() { throw new Error("disabled"); } } }, source, 1), false);
assert.doesNotThrow(() => draft.clear({ get localStorage() { throw new Error("blocked"); } }));

draft.save(windowObject, source, 1, savedAt);
draft.clear(windowObject);
assert.strictEqual(storage.records.has(draft.STORAGE_KEY), false);

console.log("Intake draft local save, restore, validation, file exclusion, error safety, and cleanup checks passed.");
