import path from "node:path";
import { fileURLToPath } from "node:url";
import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

const projectDirectory = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    cloudflareTest(async () => ({
      wrangler: { configPath: "./wrangler.jsonc" },
      miniflare: {
        bindings: {
          TEST_MIGRATIONS: await readD1Migrations(path.join(projectDirectory, "migrations")),
          NODE_ENV: "development",
          INTAKE_ALLOWED_ORIGIN: "http://localhost:8788",
          INTAKE_EMAIL_MODE: "mock",
          EMAIL_FROM: "Lang Systems <onboarding@resend.dev>"
        }
      }
    }))
  ],
  test: {
    include: ["tests/worker.Tests.ts"],
    setupFiles: ["./tests/worker-setup.ts"]
  }
});
