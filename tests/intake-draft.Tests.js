"use strict";

const assert = require("assert");
const draft = require("../intake-draft.js");

const records = new Map();
const windowObject = { sessionStorage: {
  setItem(key, value) { records.set(key, value); },
  getItem(key) { return records.get(key) || null; },
  removeItem(key) { records.delete(key); }
} };
const source = { elements: [
  { name: "contact_name", type: "text", value: "Alex Example" },
  { name: "delivery_model", type: "radio", value: "Recommendation required", checked: true },
  { name: "delivery_model", type: "radio", value: "Customer-owned", checked: false },
  { name: "privacy_consent", type: "checkbox", checked: true },
  { name: "attachments", type: "file", value: "C:\\private\\brief.pdf" },
  { name: "_honey", type: "text", value: "do-not-save" }
] };
assert.strictEqual(draft.save(windowObject, source, 7), true);
const encoded = records.get(draft.STORAGE_KEY);
assert(!encoded.includes("brief.pdf") && !encoded.includes("do-not-save"));

const target = { elements: [
  { name: "contact_name", type: "text", value: "" },
  { name: "delivery_model", type: "radio", value: "Recommendation required", checked: false },
  { name: "delivery_model", type: "radio", value: "Customer-owned", checked: true },
  { name: "privacy_consent", type: "checkbox", checked: false },
  { name: "attachments", type: "file", value: "" }
] };
assert.deepStrictEqual(draft.restore(windowObject, target, 7), { currentStep: 7 });
assert.strictEqual(target.elements[0].value, "Alex Example");
assert.strictEqual(target.elements[1].checked, true);
assert.strictEqual(target.elements[2].checked, false);
assert.strictEqual(target.elements[3].checked, true);
assert.strictEqual(target.elements[4].value, "");
draft.clear(windowObject);
assert.strictEqual(records.has(draft.STORAGE_KEY), false);

console.log("Intake draft save, restore, exclusion, and cleanup checks passed.");
