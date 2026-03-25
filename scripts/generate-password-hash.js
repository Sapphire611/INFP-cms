/**
 * Generate password hash for storage in Supabase
 * Password: 123456
 */

const bcrypt = require("bcryptjs");
const crypto = require("crypto");

async function hashPasswordWithSHA256(password) {
  const salt = "infp-cms-fixed-salt-2024";
  const data = password + salt;
  const hashBuffer = crypto.createHash("sha256").update(data).digest();
  const hashHex = hashBuffer.toString("hex");
  return hashHex;
}

async function generateFinalHash(password) {
  // Step 1: SHA-256 hash (client-side)
  const sha256Hash = await hashPasswordWithSHA256(password);
  console.log("Step 1 - SHA-256 Hash (client-side):");
  console.log(sha256Hash);
  console.log("");

  // Step 2: bcrypt hash (server-side)
  const saltRounds = 10;
  const finalHash = await bcrypt.hash(sha256Hash, saltRounds);
  console.log("Step 2 - bcrypt Hash (server-side, stored in DB):");
  console.log(finalHash);
  console.log("");

  return finalHash;
}

// Generate hash for password "123456"
generateFinalHash("123456")
  .then((hash) => {
    console.log("✅ Complete! Use this hash in Supabase 'password' column:");
    console.log(hash);
  })
  .catch((error) => {
    console.error("Error:", error);
  });
