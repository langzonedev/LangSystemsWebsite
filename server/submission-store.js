"use strict";

const crypto = require("crypto");
const fs = require("fs/promises");
const path = require("path");

const DOCUMENT_KEYS = Object.freeze(["customerSummary", "technicalSpecification", "internalBrief", "clarificationQuestions", "warnings"]);
const REVIEW_STATUSES = Object.freeze(["not_started", "in_review", "clarification_required", "approved", "declined"]);

class SubmissionStorageError extends Error {
  constructor(code = "storage") {
    super("Submission storage failed.");
    this.name = "SubmissionStorageError";
    this.code = code;
    this.statusCode = code === "not_found" ? 404 : 503;
  }
}

function validateReference(reference) {
  if (typeof reference !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._-]{5,99}$/.test(reference)) {
    const error = new SubmissionStorageError("invalid_reference");
    error.statusCode = 400;
    throw error;
  }
  return reference;
}

function recordKey(reference) {
  return crypto.createHash("sha256").update(validateReference(reference), "utf8").digest("hex");
}

function clone(value) { return JSON.parse(JSON.stringify(value)); }

function createFileSubmissionStore(rootDirectory, options = {}) {
  if (!rootDirectory || !path.isAbsolute(rootDirectory)) throw new Error("INTAKE_STORAGE_DIR must be an absolute path.");
  const root = path.resolve(rootDirectory);
  const publicRoot = path.resolve(options.publicRoot || path.join(__dirname, ".."));
  if (root === publicRoot || root.startsWith(`${publicRoot}${path.sep}`)) throw new Error("INTAKE_STORAGE_DIR must be outside the public website directory.");
  const now = options.now || (() => new Date().toISOString());
  let operation = Promise.resolve();

  function paths(reference) {
    const key = recordKey(reference);
    const directory = path.join(root, "submissions", key.slice(0, 2), key);
    return { directory, record: path.join(directory, "record.json"), documents: path.join(directory, "documents") };
  }

  async function read(reference) {
    const location = paths(reference);
    try {
      const record = JSON.parse(await fs.readFile(location.record, "utf8"));
      if (record.reference !== reference) throw new SubmissionStorageError();
      return record;
    } catch (error) {
      if (error.code === "ENOENT") return null;
      if (error instanceof SubmissionStorageError) throw error;
      throw new SubmissionStorageError();
    }
  }

  async function atomicWrite(filename, value) {
    await fs.mkdir(path.dirname(filename), { recursive: true, mode: 0o700 });
    const temporary = `${filename}.${process.pid}.${crypto.randomBytes(6).toString("hex")}.tmp`;
    await fs.writeFile(temporary, value, { mode: 0o600, flag: "wx" });
    await fs.rename(temporary, filename);
  }

  function enqueue(task) {
    const next = operation.then(task, task);
    operation = next.catch(() => undefined);
    return next;
  }

  return Object.freeze({
    async create(submission, documents) {
      return enqueue(async () => {
        const reference = validateReference(submission.submissionMetadata.submissionId);
        const existing = await read(reference);
        if (existing) return clone(existing);
        const location = paths(reference);
        try {
          const generatedDocumentReferences = {};
          await fs.mkdir(location.documents, { recursive: true, mode: 0o700 });
          for (const key of DOCUMENT_KEYS) {
            if (typeof documents[key] !== "string") continue;
            const storedName = `${crypto.randomBytes(16).toString("hex")}.txt`;
            await atomicWrite(path.join(location.documents, storedName), documents[key]);
            generatedDocumentReferences[key] = storedName;
          }
          const timestamp = now();
          const record = {
            reference,
            submittedAt: submission.submissionMetadata.submittedAt,
            receivedAt: timestamp,
            updatedAt: timestamp,
            processingStatus: "stored",
            schemaVersion: submission.submissionMetadata.schemaVersion,
            templateVersion: submission.submissionMetadata.templateVersion,
            originalSubmission: clone(submission),
            generatedDocumentReferences,
            emailDelivery: { status: "pending", customer: "pending", internal: "pending", updatedAt: timestamp },
            clarificationStatus: documents.clarificationQuestions && documents.clarificationQuestions.trim() ? "questions_generated" : "not_required",
            manualReviewStatus: "not_started",
            attachmentMetadata: clone(submission.attachments || []),
            processingErrors: [],
            audit: [{ at: timestamp, action: "submission_stored" }]
          };
          await atomicWrite(location.record, JSON.stringify(record, null, 2));
          return clone(record);
        } catch (_error) {
          // The verified target is a digest-named child of the configured private root.
          await fs.rm(location.directory, { recursive: true, force: true }).catch(() => undefined);
          throw new SubmissionStorageError();
        }
      });
    },
    async get(reference) {
      await operation;
      const record = await read(validateReference(reference));
      return record ? clone(record) : null;
    },
    async getDocument(reference, documentKey) {
      await operation;
      if (!DOCUMENT_KEYS.includes(documentKey)) return null;
      const record = await read(validateReference(reference));
      if (!record || !record.generatedDocumentReferences[documentKey]) return null;
      const filename = record.generatedDocumentReferences[documentKey];
      if (!/^[a-f0-9]{32}\.txt$/.test(filename)) throw new SubmissionStorageError();
      try { return await fs.readFile(path.join(paths(reference).documents, filename), "utf8"); }
      catch (error) { if (error.code === "ENOENT") return null; throw new SubmissionStorageError(); }
    },
    async recordDelivery(reference, delivery) {
      return enqueue(async () => {
        const record = await read(validateReference(reference));
        if (!record) throw new SubmissionStorageError("not_found");
        const timestamp = now();
        record.emailDelivery = {
          status: delivery.complete ? "sent" : "failed",
          customer: delivery.customer,
          internal: delivery.internal,
          updatedAt: timestamp
        };
        record.processingStatus = delivery.complete ? "awaiting_review" : "delivery_failed";
        record.processingErrors = delivery.complete ? [] : ["email_delivery_failed"];
        record.updatedAt = timestamp;
        record.audit.push({ at: timestamp, action: "email_delivery_updated", outcome: record.emailDelivery.status });
        await atomicWrite(paths(reference).record, JSON.stringify(record, null, 2));
        return clone(record);
      });
    },
    async updateReview(reference, status) {
      if (!REVIEW_STATUSES.includes(status)) {
        const error = new SubmissionStorageError("invalid_review_status");
        error.statusCode = 400;
        throw error;
      }
      return enqueue(async () => {
        const record = await read(validateReference(reference));
        if (!record) throw new SubmissionStorageError("not_found");
        const timestamp = now();
        const previous = record.manualReviewStatus;
        record.manualReviewStatus = status;
        record.processingStatus = status === "not_started" ? "awaiting_review" : "manual_review";
        record.updatedAt = timestamp;
        record.audit.push({ at: timestamp, action: "manual_review_updated", from: previous, to: status });
        await atomicWrite(paths(reference).record, JSON.stringify(record, null, 2));
        return clone(record);
      });
    }
  });
}

module.exports = Object.freeze({ DOCUMENT_KEYS, REVIEW_STATUSES, SubmissionStorageError, validateReference, createFileSubmissionStore });
