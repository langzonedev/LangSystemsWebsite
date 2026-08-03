(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.LangSystemsIntakeDraft = api;
}(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var STORAGE_KEY = "langSystemsProjectIntakeDraftV1";
  var EXCLUDED_FIELDS = new Set(["_honey", "attachments"]);

  function storageFor(windowObject) {
    try { return windowObject && windowObject.sessionStorage; } catch (_error) { return null; }
  }

  function fields(form) {
    return Array.from(form && form.elements || []).filter(function (field) {
      return field && field.name && !EXCLUDED_FIELDS.has(field.name) && field.type !== "file" && field.type !== "submit" && field.type !== "button";
    });
  }

  function save(windowObject, form, currentStep) {
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
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, currentStep: Math.max(0, Number(currentStep) || 0), answers: answers }));
      return true;
    } catch (_error) { return false; }
  }

  function restore(windowObject, form, maximumStep) {
    var storage = storageFor(windowObject);
    if (!storage) return null;
    var draft;
    try { draft = JSON.parse(storage.getItem(STORAGE_KEY) || "null"); } catch (_error) { return null; }
    if (!draft || draft.version !== 1 || !draft.answers || typeof draft.answers !== "object") return null;
    fields(form).forEach(function (field) {
      var saved = draft.answers[field.name];
      if (!saved || typeof saved !== "object") return;
      if (field.type === "radio") field.checked = saved.type === "radio" && String(field.value || "") === saved.value;
      else if (field.type === "checkbox") field.checked = saved.type === "checkbox" && saved.checked === true;
      else if (saved.type === "value" && typeof saved.value === "string") field.value = saved.value;
    });
    var limit = Math.max(0, Number(maximumStep) || 0);
    return { currentStep: Math.min(Math.max(0, Number(draft.currentStep) || 0), limit) };
  }

  function clear(windowObject) {
    var storage = storageFor(windowObject);
    if (!storage) return;
    try { storage.removeItem(STORAGE_KEY); } catch (_error) { /* Storage can be disabled by browser policy. */ }
  }

  return Object.freeze({ STORAGE_KEY: STORAGE_KEY, save: save, restore: restore, clear: clear });
}));
