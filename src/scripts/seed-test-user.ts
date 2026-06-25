/**
 * Seed test user for Playwright E2E tests
 * Usage: npx ts-node --compiler-options "{\"module\":\"CommonJS\"}" src/scripts/seed-test-user.ts
 */

import * as fs from "fs";
import * as path from "path";

// Manually load .env (dotenv not installed)
function loadEnv() {
  const envPath = path.resolve(process.cwd(), ".env");
  const content = fs.readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();
      // Remove surrounding quotes
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  }
}
loadEnv();

// Now import after env is loaded
import { createClient } from "@supabase/supabase-js";

async function seed() {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const testUser = {
    id: "test-admin-001",
    email: "admin@test.com",
    username: "admin_test",
    password: "$2b$10$cFk6Z.FNfs9TXE3Y0kyYgeChyJF8Y2WtySOXnK78AyM.lE7EFcPJe",
    profile_name: "Test Admin",
    user_type: "admin",
    is_active: true,
  };

  const { error } = await supabaseAdmin.from("users").upsert(testUser, { onConflict: "email" });

  if (error) {
    console.error("Failed to seed test user:", error);
    process.exit(1);
  }

  console.log("Test user seeded: admin@test.com / Rabbit611");
}

seed();
