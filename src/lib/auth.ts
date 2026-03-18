import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { User, UserType } from "@prisma/client";

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function comparePassword(candidatePassword: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, hashedPassword);
}

export async function validateCredentials(email: string, password: string): Promise<Partial<User> | null> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      password: true,
      userType: true,
      isActive: true,
      profileName: true,
      username: true,
    },
  });

  console.log({ user });
  if (!user || !user.isActive) {
    return null;
  }

  console.log({ password, "user.password": user.password });
  const isValid = await comparePassword(password, user.password);
  if (!isValid) {
    return null;
  }

  const { password: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

/**
 * Validates credentials using Supabase instead of Prisma.
 * This function is part of the migration to Supabase and maintains
 * the same interface as the original validateCredentials function.
 *
 * @param email - User email
 * @param password - User password
 * @returns User object without password if valid, null otherwise
 */
export async function validateCredentialsSupabase(email: string, password: string): Promise<Partial<User> | null> {
  const { data: user, error } = await supabaseAdmin
    .from('users')
    .select('id, email, password, userType, isActive, profileName, username')
    .eq('email', email)
    .single();

  if (error || !user || !user.isActive) {
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
export async function createSupabaseUser(
  email: string,
  password: string,
  metadata: Record<string, any> = {}
) {
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: metadata
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
