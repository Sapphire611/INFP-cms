/**
 * Quick script to set a user's password correctly
 * Usage: npx ts-node --compiler-options "{\"module\":\"CommonJS\"}" src/scripts/set-password.ts <email> <password>
 */

import { supabaseAdmin } from '../lib/supabase-admin';
import { hashPassword } from '../lib/auth';
import { hashPasswordWithSHA256 } from '../lib/crypto';

async function setUserPassword(email: string, plainPassword: string) {
  console.log(`🔄 Setting password for: ${email}`);

  // Step 1: Hash with SHA-256 (simulating frontend)
  const sha256Hash = await hashPasswordWithSHA256(plainPassword);
  console.log(`✅ SHA-256 hash: ${sha256Hash}`);

  // Step 2: Hash with bcrypt (server-side)
  const bcryptHash = await hashPassword(sha256Hash);
  console.log(`✅ Bcrypt hash: ${bcryptHash}`);

  // Step 3: Update database
  const { error } = await supabaseAdmin
    .from('users')
    .update({ password: bcryptHash })
    .eq('email', email);

  if (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }

  console.log(`✅ Password set successfully for ${email}`);
  console.log(`\nYou can now login with email: ${email} and password: ${plainPassword}`);
}

// Get arguments from command line
const email = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
  console.log('Usage: npx ts-node --compiler-options "{\"module\":\"CommonJS\"}" src/scripts/set-password.ts <email> <password>');
  console.log('\nExample: npx ts-node --compiler-options "{\"module\":\"CommonJS\"}" src/scripts/set-password.ts liuliyi611@qq.com MyPassword123');
  process.exit(1);
}

setUserPassword(email, password);
