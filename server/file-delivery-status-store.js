"use strict";

const fs = require("fs/promises");
const path = require("path");

// Stores delivery metadata only: references, recipient states, provider IDs, attempts, and timestamps.
// Customer answers and email content must never be passed to this store.
function createFileDeliveryStatusStore(filename) {
  if (!filename || !path.isAbsolute(filename)) throw new Error("INTAKE_STATUS_FILE must be an absolute path.");
  let operation = Promise.resolve();

  async function readRecords() {
    try {
      return JSON.parse(await fs.readFile(filename, "utf8"));
    } catch (error) {
      if (error.code === "ENOENT") return {};
      throw error;
    }
  }

  return Object.freeze({
    async get(reference) {
      await operation;
      const records = await readRecords();
      return records[reference] || null;
    },
    async set(reference, record) {
      operation = operation.then(async () => {
        const records = await readRecords();
        records[reference] = record;
        await fs.mkdir(path.dirname(filename), { recursive: true });
        const temporary = `${filename}.${process.pid}.tmp`;
        await fs.writeFile(temporary, JSON.stringify(records, null, 2), { encoding: "utf8", mode: 0o600 });
        await fs.rename(temporary, filename);
      });
      await operation;
      return record;
    }
  });
}

module.exports = Object.freeze({ createFileDeliveryStatusStore });
