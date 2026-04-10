import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/supabase-admin";

// User interface
export interface User {
  id: string;
  email: string;
  userType: "admin" | "user";
  isActive: boolean;
  profileName?: string;
  username: string;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function comparePassword(candidatePassword: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, hashedPassword);
}

/**
 * Validates credentials using Supabase with backward compatibility.
 * Supports both new format (SHA-256 + bcrypt) and old format (bcrypt only).
 *
 * @param email - User email
 * @param password - User password (should be SHA-256 hashed from client)
 * @returns User object without password if valid, null otherwise
 */
export async function validateCredentials(email: string, password: string): Promise<Partial<User> | null> {
  const { data: user, error } = await supabaseAdmin
    .from("users")
    .select("id, email, password, user_type, is_active, profile_name, username")
    .eq("email", email)
    .single();

  console.log({ user });
  if (error || !user || !user.is_active) {
    return null;
  }

  // Try new format first (password is already SHA-256 hashed)
  let isValid = await comparePassword(password, user.password);

  // If new format fails, try old format for backward compatibility
  // This allows existing users to login and their password will be auto-upgraded
  if (!isValid) {
    // For old format, we need to check if the sent password is actually the original plaintext
    // We can detect this by checking if it's a valid SHA-256 hash
    const { isValidSHA256Hash } = await import("@/lib/crypto");

    if (!isValidSHA256Hash(password)) {
      // The password is not a SHA-256 hash, so it's likely plaintext (old format)
      // Hash it now and try to validate
      const { hashPasswordWithSHA256 } = await import("@/lib/crypto");
      const hashedPassword = await hashPasswordWithSHA256(password);
      isValid = await comparePassword(hashedPassword, user.password);

      if (isValid) {
        // Auto-upgrade: Update the password to new format
        console.log("Auto-upgrading user password to new format:", user.id);
        const newHashedPassword = await hashPassword(hashedPassword);
        await supabaseAdmin
          .from("users")
          .update({ password: newHashedPassword })
          .eq("id", user.id);
      }
    }
  }

  if (!isValid) {
    return null;
  }

  const { password: _, ...rawUser } = user;

  // Map snake_case DB columns to camelCase
  return {
    id: rawUser.id,
    email: rawUser.email,
    userType: rawUser.user_type as "admin" | "user",
    isActive: rawUser.is_active,
    profileName: rawUser.profile_name ?? undefined,
    username: rawUser.username,
  };
}

/**
 * Creates a user in Supabase Auth system.
 * This is used for CMS users who will use Supabase Auth.
 *
 * @param email - User email
 * @param password - User password
 * @param metadata - Additional user metadata
 * @returns Created user data and error if any
 */
export async function createSupabaseUser(email: string, password: string, metadata: Record<string, any> = {}) {
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: metadata,
  });

  return { data, error };
}

/**
 * Signs in a user using Supabase Auth.
 * This creates a Supabase session alongside our custom JWT.
 *
 * @param email - User email
 * @param password - User password
 * @returns Supabase session data and error if any
 */
export async function signInSupabase(email: string, password: string) {
  const { data, error } = await supabaseAdmin.auth.signInWithPassword({
    email,
    password,
  });

  return { data, error };
}
