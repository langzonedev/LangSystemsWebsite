(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.LangSystemsIntakeDraft = api;
}(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var SCHEMA_VERSION = 2;
  var STORAGE_KEY = "langSystemsProjectIntakeDraftV2";
  var EXCLUDED_FIELDS = new Set(["_honey", "attachments"]);

  function storageFor(windowObject) {
    try { return windowObject && windowObject.localStorage; } catch (_error) { return null; }
  }

  function fields(form) {
    return Array.from(form && form.elements || []).filter(function (field) {
      return field && field.name && !EXCLUDED_FIELDS.has(field.name) && field.type !== "file" && field.type !== "submit" && field.type !== "button";
    });
  }

  function discard(storage) {
    if (!storage) return;
    try { storage.removeItem(STORAGE_KEY); } catch (_error) { /* Storage can be disabled or full. */ }
  }

  function selectedFileCount(form) {
    try {
      var input = form && form.elements && typeof form.elements.namedItem === "function"
        ? form.elements.namedItem("attachments")
        : Array.from(form && form.elements || []).find(function (field) { return field.name === "attachments"; });
      return Math.max(0, Number(input && input.files && input.files.length) || 0);
    } catch (_error) { return 0; }
  }

  function save(windowObject, form, currentStep, now, rememberedFileCount) {
    var storage = storageFor(windowObject);
    if (!storage) return false;
    var answers = {};
    fields(form).forEach(function (field) {
      if (field.type === "radio") {
        if (field.checked) answers[field.name] = { type: "radio", value: String(field.value || "") };
      } else if (field.type === "checkbox") {
        answers[field.name] = { type: "checkbox", checked: field.checked === true };
      } else {
        answers[field.name] = { type: "value", value: String(field.value || "") };
      }
    });
    var savedAt = now instanceof Date ? now : new Date();
    var payload = {
      schemaVersion: SCHEMA_VERSION,
      savedAt: savedAt.toISOString(),
      currentStep: Math.max(0, Math.floor(Number(currentStep) || 0)),
      answers: answers,
      selectedFileCount: Math.max(selectedFileCount(form), Math.max(0, Math.floor(Number(rememberedFileCount) || 0)))
    };
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(payload));
      return true;
    } catch (_error) { return false; }
  }

  function validDraft(draft) {
    return draft && draft.schemaVersion === SCHEMA_VERSION &&
      typeof draft.savedAt === "string" && !Number.isNaN(Date.parse(draft.savedAt)) &&
      Number.isInteger(draft.currentStep) && draft.currentStep >= 0 &&
      draft.answers && typeof draft.answers === "object" && !Array.isArray(draft.answers) &&
      Number.isInteger(draft.selectedFileCount) && draft.selectedFileCount >= 0;
  }

  function restore(windowObject, form, maximumStep) {
    var storage = storageFor(windowObject);
    if (!storage) return null;
    var draft;
    try { draft = JSON.parse(storage.getItem(STORAGE_KEY) || "null"); } catch (_error) {
      discard(storage);
      return null;
    }
    if (!validDraft(draft)) {
      if (draft !== null) discard(storage);
      return null;
    }
    fields(form).forEach(function (field) {
      var saved = draft.answers[field.name];
      if (!saved || typeof saved !== "object") return;
      if (field.type === "radio") field.checked = saved.type === "radio" && typeof saved.value === "string" && String(field.value || "") === saved.value;
      else if (field.type === "checkbox") field.checked = saved.type === "checkbox" && saved.checked === true;
      else if (saved.type === "value" && typeof saved.value === "string") field.value = saved.value;
    });
    var limit = Math.max(0, Math.floor(Number(maximumStep) || 0));
    return {
      currentStep: Math.min(draft.currentStep, limit),
      savedAt: draft.savedAt,
      selectedFileCount: draft.selectedFileCount
    };
  }

  function clear(windowObject) {
    discard(storageFor(windowObject));
  }

  return Object.freeze({
    SCHEMA_VERSION: SCHEMA_VERSION,
    STORAGE_KEY: STORAGE_KEY,
    save: save,
    restore: restore,
    clear: clear
  });
}));
