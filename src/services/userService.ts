import { supabaseAdmin } from '@/lib/supabase-admin';
import { hashPassword } from '@/lib/auth';
import { hashPasswordWithSHA256 } from '@/lib/crypto';

// Keep existing interfaces for compatibility
export interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  userType: 'admin' | 'user';
  profileName?: string;
  profilePhone?: string;
  profileAvatar?: string;
}

export interface UpdateUserRequest {
  username?: string;
  email?: string;
  password?: string;
  userType?: 'admin' | 'user';
  profileName?: string;
  profilePhone?: string;
  profileAvatar?: string;
  isActive?: boolean;
}

export interface FindUsersQuery {
  search?: string;
  userType?: 'admin' | 'user';
  isActive?: boolean;
}

export interface PaginationOptions {
  page: number;
  pageSize: number;
}

// User type matching the database structure
export interface User {
  id: string;
  username: string;
  email: string;
  userType: 'admin' | 'user';
  profileName: string | null;
  profilePhone: string | null;
  profileAvatar: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Find users with filtering and pagination using Supabase
 */
export async function findUsers(
  query: FindUsersQuery = {},
  pagination: PaginationOptions = { page: 1, pageSize: 10 }
) {
  const { search, userType, isActive } = query;
  const { page, pageSize } = pagination;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let queryBuilder = supabaseAdmin
    .from('users')
    .select('id, username, email, user_type, profile_name, profile_phone, profile_avatar, is_active, created_at, updated_at',
      { count: 'exact' }
    );

  // Search filtering
  if (search) {
    queryBuilder = queryBuilder.or(`username.ilike.%${search}%,email.ilike.%${search}%,profile_name.ilike.%${search}%`);
  }

  // User type filtering
  if (userType) {
    queryBuilder = queryBuilder.eq('user_type', userType);
  }

  // Active status filtering
  if (isActive !== undefined) {
    queryBuilder = queryBuilder.eq('is_active', isActive);
  }

  // Pagination and ordering
  queryBuilder = queryBuilder
    .order('created_at', { ascending: false })
    .range(from, to);

  const { data: users, error, count } = await queryBuilder;

  if (error) throw error;

  // Transform snake_case to camelCase
  const transformedUsers = users?.map(user => ({
    id: user.id,
    username: user.username,
    email: user.email,
    userType: user.user_type,
    profileName: user.profile_name,
    profilePhone: user.profile_phone,
    profileAvatar: user.profile_avatar,
    isActive: user.is_active,
    createdAt: new Date(user.created_at),
    updatedAt: new Date(user.updated_at)
  })) || [];

  return {
    users: transformedUsers,
    pagination: {
      page,
      pageSize,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / pageSize),
    },
  };
}

/**
 * Find user by ID using Supabase
 */
export async function findUserById(id: string) {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('id, username, email, user_type, profile_name, profile_phone, profile_avatar, is_active, created_at, updated_at')
    .eq('id', id)
    .single();

  if (error) throw error;

  return {
    id: data.id,
    username: data.username,
    email: data.email,
    userType: data.user_type,
    profileName: data.profile_name,
    profilePhone: data.profile_phone,
    profileAvatar: data.profile_avatar,
    isActive: data.is_active,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at)
  };
}

/**
 * Create user using Supabase
 */
export async function createUser(data: CreateUserRequest) {
  const sha256 = await hashPasswordWithSHA256(data.password);
  const hashedPassword = await hashPassword(sha256);

  const { data: user, error } = await supabaseAdmin
    .from('users')
    .insert({
      id: crypto.randomUUID(),
      username: data.username,
      email: data.email,
      password: hashedPassword,
      user_type: data.userType,
      profile_name: data.profileName,
      profile_phone: data.profilePhone,
      profile_avatar: data.profileAvatar,
      is_active: true
    })
    .select('id, username, email, user_type, profile_name, profile_phone, profile_avatar, is_active, created_at, updated_at')
    .single();

  if (error) throw error;

  return {
    id: user.id,
    username: user.username,
    email: user.email,
    userType: user.user_type,
    profileName: user.profile_name,
    profilePhone: user.profile_phone,
    profileAvatar: user.profile_avatar,
    isActive: user.is_active,
    createdAt: new Date(user.created_at),
    updatedAt: new Date(user.updated_at)
  };
}

/**
 * Update user using Supabase
 */
export async function updateUser(id: string, data: UpdateUserRequest) {
  const updateData: any = {};

  if (data.username) updateData.username = data.username;
  if (data.email) updateData.email = data.email;
  if (data.userType) updateData.user_type = data.userType;
  if (data.profileName !== undefined) updateData.profile_name = data.profileName;
  if (data.profilePhone !== undefined) updateData.profile_phone = data.profilePhone;
  if (data.profileAvatar !== undefined) updateData.profile_avatar = data.profileAvatar;
  if (data.isActive !== undefined) updateData.is_active = data.isActive;

  if (data.password) {
    const sha256 = await hashPasswordWithSHA256(data.password);
    updateData.password = await hashPassword(sha256);
  }

  const { data: user, error } = await supabaseAdmin
    .from('users')
    .update(updateData)
    .eq('id', id)
    .select('id, username, email, user_type, profile_name, profile_phone, profile_avatar, is_active, created_at, updated_at')
    .single();

  if (error) throw error;

  return {
    id: user.id,
    username: user.username,
    email: user.email,
    userType: user.user_type,
    profileName: user.profile_name,
    profilePhone: user.profile_phone,
    profileAvatar: user.profile_avatar,
    isActive: user.is_active,
    createdAt: new Date(user.created_at),
    updatedAt: new Date(user.updated_at)
  };
}

/**
 * Delete user using Supabase
 */
export async function deleteUser(id: string) {
  const { data: user, error } = await supabaseAdmin
    .from('users')
    .delete()
    .eq('id', id)
    .select('id, username, email, user_type, profile_name, profile_phone, profile_avatar, is_active, created_at, updated_at')
    .single();

  if (error) throw error;

  return {
    id: user.id,
    username: user.username,
    email: user.email,
    userType: user.user_type,
    profileName: user.profile_name,
    profilePhone: user.profile_phone,
    profileAvatar: user.profile_avatar,
    isActive: user.is_active,
    createdAt: new Date(user.created_at),
    updatedAt: new Date(user.updated_at)
  };
}

/**
 * Find user by email using Supabase
 */
export async function findByEmail(email: string) {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('email', email)
    .single();

  if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found

  if (!data) return null;

  return {
    id: data.id,
    username: data.username,
    email: data.email,
    password: data.password,
    userType: data.user_type,
    profileName: data.profile_name,
    profilePhone: data.profile_phone,
    profileAvatar: data.profile_avatar,
    isActive: data.is_active,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at)
  };
}

/**
 * Find user by username using Supabase
 */
export async function findByUsername(username: string) {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('username', username)
    .single();

  if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found

  if (!data) return null;

  return {
    id: data.id,
    username: data.username,
    email: data.email,
    password: data.password,
    userType: data.user_type,
    profileName: data.profile_name,
    profilePhone: data.profile_phone,
    profileAvatar: data.profile_avatar,
    isActive: data.is_active,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at)
  };
}

/**
 * Get user statistics using Supabase
 */
export async function getUserStats() {
  const [totalResult, activeResult, adminResult, userResult] = await Promise.all([
    supabaseAdmin.from('users').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('users').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabaseAdmin.from('users').select('*', { count: 'exact', head: true }).eq('user_type', 'admin'),
    supabaseAdmin.from('users').select('*', { count: 'exact', head: true }).eq('user_type', 'user'),
  ]);

  const totalUsers = totalResult.count || 0;
  const activeUsers = activeResult.count || 0;
  const adminCount = adminResult.count || 0;
  const userCount = userResult.count || 0;

  return {
    totalUsers,
    activeUsers,
    adminCount,
    userCount,
    inactiveUsers: totalUsers - activeUsers,
  };
}

/**
 * Get user growth statistics using Supabase
 */
export async function getUserGrowthStats() {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [totalResult, growthResult] = await Promise.all([
    supabaseAdmin.from('users').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('users').select('*', { count: 'exact', head: true })
      .gte('created_at', thirtyDaysAgo.toISOString())
  ]);

  const totalCount = totalResult.count || 0;
  const last30DaysCount = growthResult.count || 0;

  return {
    total: totalCount,
    growth: last30DaysCount,
    growthRate: totalCount > 0 ? ((last30DaysCount / totalCount) * 100).toFixed(2) : '0.00',
  };
}