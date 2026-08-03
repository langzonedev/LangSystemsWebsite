import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import worker, { referenceFor, validateDocuments } from "../worker/index";
import IntakeModel from "../intake-model.js";

const submission = IntakeModel.createSubmission({
  contact_name: "Alex Example",
  business_name: "Example Operations",
  email: "alex@example.com",
  business_description: "Regional service business",
  current_process: "Email and spreadsheet",
  problem_impact: "Updates are missed",
  problem: "Jobs are difficult to track",
  desired_outcome: "One clear view",
  users: "Office staff",
  first_release: "Track jobs",
  acceptance_criteria: "Staff can close a job",
  delivery_model: "Recommendation required",
  budget: "Not sure — please advise",
  timing: "Exploring options only",
  privacy_consent: "Agreed"
}, { submissionId: "LS-WORKER-TEST" });

const documents = {
  customerSummary: "Customer summary",
  technicalSpecification: "Technical specification",
  internalBrief: "Internal brief",
  clarificationQuestions: "Clarification questions",
  warnings: ""
};

describe("Lang Systems intake Worker", () => {
  it("reports a safe health status", async () => {
    const response = await worker.fetch(new Request("http://worker.test/healthz"), env);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, service: "lang-systems-intake" });
  });

  it("rejects an unapproved website origin", async () => {
    const response = await worker.fetch(new Request("http://worker.test/api/project-submissions", {
      method: "POST",
      headers: { Origin: "https://malicious.example", "Content-Type": "application/json" },
      body: "{}"
    }), env);
    expect(response.status).toBe(403);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });

  it("stores before mock email delivery and safely handles a retry", async () => {
    const request = () => new Request("http://worker.test/api/project-submissions", {
      method: "POST",
      headers: {
        Origin: "http://localhost:8788",
        "Content-Type": "application/json",
        "Idempotency-Key": "LS-WORKER-TEST"
      },
      body: JSON.stringify({ submission, documents, honeypot: "" })
    });
    const expectedReference = await referenceFor("LS-WORKER-TEST", env.INTAKE_REFERENCE_SECRET);

    const first = await worker.fetch(request(), env);
    expect(first.status).toBe(201);
    const firstBody = await first.json() as Record<string, unknown>;
    expect(firstBody.submissionReference).toBe(expectedReference);
    expect(firstBody.customerEmailStatus).toBe("sent");
    expect(firstBody.internalEmailStatus).toBe("sent");

    const stored = await env.INTAKE_DB.prepare(
      "SELECT processing_status, original_submission_json FROM submissions WHERE reference = ?"
    ).bind(expectedReference).first<{ processing_status: string; original_submission_json: string }>();
    expect(stored?.processing_status).toBe("awaiting_review");
    expect(JSON.parse(stored!.original_submission_json).customerAnswers.customer.emailAddress).toBe("alex@example.com");

    const retry = await worker.fetch(request(), env);
    expect(retry.status).toBe(200);
    const count = await env.INTAKE_DB.prepare("SELECT COUNT(*) AS total FROM submissions WHERE reference = ?")
      .bind(expectedReference).first<{ total: number }>();
    expect(count?.total).toBe(1);
  });

  it("rejects missing generated documents", () => {
    expect(() => validateDocuments({ customerSummary: "Only one" })).toThrow();
  });
});
