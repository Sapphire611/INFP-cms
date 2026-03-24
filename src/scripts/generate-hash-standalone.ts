/**
 * Standalone password hash generator
 * Usage: npx ts-node --compiler-options "{\"module\":\"CommonJS\"}" src/scripts/generate-hash-standalone.ts <password>
 */

import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

async function generatePasswordHash(plainPassword: string) {
  const salt = "infp-cms-fixed-salt-2024";

  console.log(`📝 Generating password hash for: "${plainPassword}"`);
  console.log(`🔑 Using salt: "${salt}"`);
  console.log('');

  // Step 1: Hash with SHA-256 (what frontend does)
  const sha256Hash = crypto.createHash('sha256')
    .update(plainPassword + salt)
    .digest('hex');

  console.log(`Step 1 - SHA-256 Hash (frontend sends this):`);
  console.log(sha256Hash);
  console.log('');

  // Step 2: Hash with bcrypt (what backend does)
  const bcryptHash = await bcrypt.hash(sha256Hash, 10);

  console.log(`Step 2 - Bcrypt Hash (STORE THIS IN DATABASE):`);
  console.log(bcryptHash);
  console.log('');

  console.log(`✅ SQL to update your database:`);
  console.log(`UPDATE users SET password = '${bcryptHash}' WHERE email = 'liuliyi611@qq.com';`);
}

const password = process.argv[2] || '123456';
generatePasswordHash(password);
