/**
 * User Password Management Script
 *
 * This script helps administrators manage user passwords during the migration
 * from old password format (plaintext transmission) to new format (SHA-256 hashing).
 *
 * Usage:
 *   npx ts-node src/scripts/manage-user-passwords.ts
 */

import { supabaseAdmin } from '../lib/supabase-admin';
import { hashPassword } from '../lib/auth';
import { hashPasswordWithSHA256 } from '../lib/crypto';

interface UserInfo {
  id: string;
  email: string;
  username: string;
  userType: string;
  isActive: boolean;
  createdAt: Date;
}

/**
 * List all users in the system
 */
async function listUsers(): Promise<UserInfo[]> {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('id, email, username, user_type, is_active, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching users:', error);
    throw error;
  }

  return data.map(user => ({
    id: user.id,
    email: user.email,
    username: user.username,
    userType: user.user_type,
    isActive: user.is_active,
    createdAt: new Date(user.created_at),
  }));
}

/**
 * Reset a user's password to a new password
 * @param userId - The user ID
 * @param newPassword - The new password (plaintext, will be hashed with SHA-256 then bcrypt)
 */
async function resetUserPassword(userId: string, newPassword: string): Promise<void> {
  console.log(`\n🔄 Resetting password for user: ${userId}`);

  // Hash with SHA-256 first (client-side simulation)
  const sha256Hash = await hashPasswordWithSHA256(newPassword);

  // Then hash with bcrypt (server-side)
  const bcryptHash = await hashPassword(sha256Hash);

  const { error } = await supabaseAdmin
    .from('users')
    .update({ password: bcryptHash })
    .eq('id', userId);

  if (error) {
    console.error('❌ Error resetting password:', error);
    throw error;
  }

  console.log('✅ Password reset successfully!');
  console.log('   New password format: SHA-256 + bcrypt');
}

/**
 * Force password reset for all users (sets a temporary password)
 * @param tempPassword - Temporary password to set for all users
 */
async function forceResetAllUsers(tempPassword: string): Promise<void> {
  console.log('\n⚠️  WARNING: This will reset passwords for ALL users!');
  console.log('Users will need to use the temporary password to login.');

  // TODO: Implement confirmation prompt
  // const { confirm } = await import('../lib/prompt');
  // For now, we'll just proceed

  // Hash the temporary password
  const sha256Hash = await hashPasswordWithSHA256(tempPassword);
  const bcryptHash = await hashPassword(sha256Hash);

  const { error } = await supabaseAdmin
    .from('users')
    .update({ password: bcryptHash });

  if (error) {
    console.error('❌ Error resetting all passwords:', error);
    throw error;
  }

  console.log(`✅ All user passwords have been reset to: ${tempPassword}`);
  console.log('   Please notify users to change their passwords immediately.');
}

/**
 * Display user statistics
 */
async function displayUserStats(): Promise<void> {
  const users = await listUsers();

  console.log('\n📊 User Statistics:');
  console.log('='.repeat(60));
  console.log(`Total Users: ${users.length}`);
  console.log(`Active Users: ${users.filter(u => u.isActive).length}`);
  console.log(`Inactive Users: ${users.filter(u => !u.isActive).length}`);
  console.log(`Admins: ${users.filter(u => u.userType === 'admin').length}`);
  console.log(`Regular Users: ${users.filter(u => u.userType === 'user').length}`);
  console.log('='.repeat(60));

  console.log('\n👥 User List:');
  console.log('-'.repeat(60));
  users.forEach((user, index) => {
    console.log(`${index + 1}. ${user.email} (${user.username})`);
    console.log(`   Type: ${user.userType} | Active: ${user.isActive ? '✅' : '❌'}`);
    console.log(`   Created: ${user.createdAt.toLocaleString()}`);
    console.log('');
  });
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  try {
    switch (command) {
      case 'list':
        await displayUserStats();
        break;

      case 'reset':
        const userId = args[1];
        const newPassword = args[2];
        if (!userId || !newPassword) {
          console.error('Usage: npx ts-node src/scripts/manage-user-passwords.ts reset <user-id> <new-password>');
          process.exit(1);
        }
        await resetUserPassword(userId, newPassword);
        break;

      case 'reset-all':
        const tempPassword = args[1] || 'TempPassword123!';
        await forceResetAllUsers(tempPassword);
        break;

      default:
        console.log(`
User Password Management Tool
=============================

Usage:
  npx ts-node src/scripts/manage-user-passwords.ts <command> [options]

Commands:
  list                    List all users and display statistics
  reset <user-id> <pwd>   Reset password for a specific user
  reset-all [password]    Reset ALL users to a temporary password (⚠️  DANGEROUS!)

Examples:
  npx ts-node src/scripts/manage-user-passwords.ts list
  npx ts-node src/scripts/manage-user-passwords.ts reset user-123 "NewPassword123!"
  npx ts-node src/scripts/manage-user-passwords.ts reset-all "TempPass123!"

Note:
  This tool is for managing passwords during the migration to SHA-256 hashing.
  All passwords are hashed with SHA-256 + bcrypt before storage.
        `);
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { listUsers, resetUserPassword, displayUserStats };
