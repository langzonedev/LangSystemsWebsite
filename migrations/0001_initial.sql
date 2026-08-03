PRAGMA foreign_keys = ON;

CREATE TABLE submissions (
  reference TEXT PRIMARY KEY,
  internal_id TEXT NOT NULL UNIQUE,
  idempotency_key_hash TEXT NOT NULL,
  payload_fingerprint TEXT NOT NULL,
  submitted_at TEXT NOT NULL,
  received_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  processing_status TEXT NOT NULL,
  schema_version TEXT NOT NULL,
  template_version TEXT NOT NULL,
  original_submission_json TEXT NOT NULL,
  attachment_metadata_json TEXT NOT NULL,
  manual_review_status TEXT NOT NULL DEFAULT 'not_started',
  processing_errors_json TEXT NOT NULL DEFAULT '[]'
);

CREATE INDEX submissions_received_at_idx ON submissions(received_at DESC);

CREATE TABLE submission_documents (
  reference TEXT NOT NULL REFERENCES submissions(reference) ON DELETE CASCADE,
  document_key TEXT NOT NULL,
  content TEXT NOT NULL,
  PRIMARY KEY (reference, document_key)
);

CREATE TABLE delivery_status (
  reference TEXT PRIMARY KEY REFERENCES submissions(reference) ON DELETE CASCADE,
  customer_json TEXT NOT NULL,
  internal_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE audit_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reference TEXT NOT NULL REFERENCES submissions(reference) ON DELETE CASCADE,
  occurred_at TEXT NOT NULL,
  action TEXT NOT NULL,
  outcome TEXT
);

CREATE INDEX audit_events_reference_idx ON audit_events(reference, occurred_at DESC);

CREATE TABLE rate_limit_events (
  client_hash TEXT NOT NULL,
  occurred_at INTEGER NOT NULL
);

CREATE INDEX rate_limit_events_lookup_idx ON rate_limit_events(client_hash, occurred_at);
