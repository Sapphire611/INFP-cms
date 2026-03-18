import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/supabase-admin";

// User interface
export interface User {
  id: string;
  email: string;
  userType: 'admin' | 'user';
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
 * Validates credentials using Supabase.
 * Replaces the old Prisma-based validateCredentials function.
 *
 * @param email - User email
 * @param password - User password
 * @returns User object without password if valid, null otherwise
 */
export async function validateCredentials(email: string, password: string): Promise<Partial<User> | null> {
  const { data: user, error } = await supabaseAdmin
    .from("users")
    .select("id, email, password, user_type, is_active, profile_name, username")
    .eq("email", email)
    .single();

  if (error || !user || !user.is_active) {
    return null;
  }

  const isValid = await comparePassword(password, user.password);
  if (!isValid) {
    return null;
  }

  const { password: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
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
