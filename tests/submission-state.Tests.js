"use strict";

const assert = require("assert");
const { states, create } = require("../submission-state.js");

const completed = create();
assert.strictEqual(completed.state, states.IDLE);
assert.strictEqual(completed.transition("validate"), states.VALIDATING);
assert.strictEqual(completed.transition("submit"), states.SUBMITTING);
assert.strictEqual(completed.transition("received"), states.RECEIVED);
assert.strictEqual(completed.transition("process"), states.PROCESSING);
assert.strictEqual(completed.transition("complete"), states.COMPLETE);
assert.throws(() => completed.transition("fail"), /Invalid submission transition/);

const failedRetry = create();
failedRetry.transition("validate");
failedRetry.transition("submit");
failedRetry.transition("fail");
assert.strictEqual(failedRetry.state, states.FAILED);
assert.strictEqual(failedRetry.transition("retry"), states.VALIDATING);
failedRetry.transition("submit");
failedRetry.transition("received");
failedRetry.transition("process");
assert.strictEqual(failedRetry.transition("partial"), states.EMAIL_PARTIAL);

const invalid = create();
invalid.transition("validate");
assert.strictEqual(invalid.transition("invalid"), states.IDLE);

console.log("Submission state transition, retry, partial-email, and terminal-state checks passed.");
