/**
 * Generate correct password hash for manual database update
 * Usage: npx ts-node --compiler-options "{\"module\":\"CommonJS\"}" src/scripts/generate-password-hash.ts <password>
 */

import { hashPassword } from '../lib/auth';
import { hashPasswordWithSHA256 } from '../lib/crypto';

async function generatePasswordHash(plainPassword: string) {
  console.log(`📝 Generating password hash for: "${plainPassword}"`);
  console.log('');

  // Step 1: Hash with SHA-256 (what frontend does)
  const sha256Hash = await hashPasswordWithSHA256(plainPassword);
  console.log(`Step 1 - SHA-256 Hash (frontend):`);
  console.log(sha256Hash);
  console.log('');

  // Step 2: Hash with bcrypt (what backend does)
  const bcryptHash = await hashPassword(sha256Hash);
  console.log(`Step 2 - Bcrypt Hash (store this in DB):`);
  console.log(bcryptHash);
  console.log('');

  console.log(`✅ Copy the Bcrypt Hash above and update your database:`);
  console.log(`   UPDATE users SET password = '${bcryptHash}' WHERE email = 'liuliyi611@qq.com';`);
}

const password = process.argv[2] || '123456';
generatePasswordHash(password);
