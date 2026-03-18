import { supabaseAdmin } from '@/lib/supabase-admin';

// Keep existing interfaces for compatibility
export interface CreateWechatUserRequest {
  profileName: string;
  profilePhone?: string;
  profileAvatar?: string;
  profileIdNumber?: string;
  openid?: string;
  unionid?: string;
  wechatNickname?: string;
  wechatAvatarUrl?: string;
  isActive?: boolean;
}

export interface UpdateWechatUserRequest {
  profileName?: string;
  profilePhone?: string;
  profileAvatar?: string;
  profileIdNumber?: string;
  openid?: string;
  unionid?: string;
  wechatNickname?: string;
  wechatAvatarUrl?: string;
  isActive?: boolean;
  lastLoginAt?: Date;
}

export interface FindWechatUsersQuery {
  search?: string;
  isActive?: boolean;
}

export interface PaginationOptions {
  page: number;
  pageSize: number;
}

// WechatUser type matching the database structure
export interface WechatUser {
  id: string;
  profileName: string | null;
  profilePhone: string | null;
  profileAvatar: string | null;
  profileIdNumber: string | null;
  openid: string | null;
  unionid: string | null;
  wechatNickname: string | null;
  wechatAvatarUrl: string | null;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Find WeChat users with filtering and pagination using Supabase
 */
export async function findWechatUsers(
  query: FindWechatUsersQuery = {},
  pagination: PaginationOptions = { page: 1, pageSize: 10 }
) {
  const { search, isActive } = query;
  const { page, pageSize } = pagination;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let queryBuilder = supabaseAdmin
    .from('wechat_users')
    .select('*', { count: 'exact' });

  // Search filtering
  if (search) {
    queryBuilder = queryBuilder.or(`profile_name.ilike.%${search}%,profile_phone.ilike.%${search}%,wechat_nickname.ilike.%${search}%`);
  }

  // Active status filtering
  if (isActive !== undefined) {
    queryBuilder = queryBuilder.eq('is_active', isActive);
  }

  // Pagination and ordering
  queryBuilder = queryBuilder
    .order('created_at', { ascending: false })
    .range(from, to);

  const { data: wechatUsers, error, count } = await queryBuilder;

  if (error) throw error;

  // Transform snake_case to camelCase
  const transformedUsers = wechatUsers?.map(user => ({
    id: user.id,
    profileName: user.profile_name,
    profilePhone: user.profile_phone,
    profileAvatar: user.profile_avatar,
    profileIdNumber: user.profile_id_number,
    openid: user.openid,
    unionid: user.unionid,
    wechatNickname: user.wechat_nickname,
    wechatAvatarUrl: user.wechat_avatar_url,
    isActive: user.is_active,
    lastLoginAt: user.last_login_at ? new Date(user.last_login_at) : null,
    createdAt: new Date(user.created_at),
    updatedAt: new Date(user.updated_at)
  })) || [];

  return {
    wechatUsers: transformedUsers,
    pagination: {
      page,
      pageSize,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / pageSize),
    },
  };
}

/**
 * Find WeChat user by ID using Supabase
 */
export async function findWechatUserById(id: string) {
  const { data, error } = await supabaseAdmin
    .from('wechat_users')
    .select('*')
    .eq('id', id)
    .single();

  if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found

  if (!data) return null;

  return {
    id: data.id,
    profileName: data.profile_name,
    profilePhone: data.profile_phone,
    profileAvatar: data.profile_avatar,
    profileIdNumber: data.profile_id_number,
    openid: data.openid,
    unionid: data.unionid,
    wechatNickname: data.wechat_nickname,
    wechatAvatarUrl: data.wechat_avatar_url,
    isActive: data.is_active,
    lastLoginAt: data.last_login_at ? new Date(data.last_login_at) : null,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at)
  };
}

/**
 * Create WeChat user using Supabase
 */
export async function createWechatUser(data: CreateWechatUserRequest) {
  const { data: wechatUser, error } = await supabaseAdmin
    .from('wechat_users')
    .insert({
      id: crypto.randomUUID(),
      profile_name: data.profileName,
      profile_phone: data.profilePhone,
      profile_avatar: data.profileAvatar,
      profile_id_number: data.profileIdNumber,
      openid: data.openid,
      unionid: data.unionid,
      wechat_nickname: data.wechatNickname,
      wechat_avatar_url: data.wechatAvatarUrl,
      is_active: data.isActive !== undefined ? data.isActive : true
    })
    .select('*')
    .single();

  if (error) throw error;

  return {
    id: wechatUser.id,
    profileName: wechatUser.profile_name,
    profilePhone: wechatUser.profile_phone,
    profileAvatar: wechatUser.profile_avatar,
    profileIdNumber: wechatUser.profile_id_number,
    openid: wechatUser.openid,
    unionid: wechatUser.unionid,
    wechatNickname: wechatUser.wechat_nickname,
    wechatAvatarUrl: wechatUser.wechat_avatar_url,
    isActive: wechatUser.is_active,
    lastLoginAt: wechatUser.last_login_at ? new Date(wechatUser.last_login_at) : null,
    createdAt: new Date(wechatUser.created_at),
    updatedAt: new Date(wechatUser.updated_at)
  };
}

/**
 * Update WeChat user using Supabase
 */
export async function updateWechatUser(id: string, data: UpdateWechatUserRequest) {
  const updateData: any = {};

  if (data.profileName !== undefined) updateData.profile_name = data.profileName;
  if (data.profilePhone !== undefined) updateData.profile_phone = data.profilePhone;
  if (data.profileAvatar !== undefined) updateData.profile_avatar = data.profileAvatar;
  if (data.profileIdNumber !== undefined) updateData.profile_id_number = data.profileIdNumber;
  if (data.openid !== undefined) updateData.openid = data.openid;
  if (data.unionid !== undefined) updateData.unionid = data.unionid;
  if (data.wechatNickname !== undefined) updateData.wechat_nickname = data.wechatNickname;
  if (data.wechatAvatarUrl !== undefined) updateData.wechat_avatar_url = data.wechatAvatarUrl;
  if (data.isActive !== undefined) updateData.is_active = data.isActive;
  if (data.lastLoginAt !== undefined) updateData.last_login_at = data.lastLoginAt;

  const { data: wechatUser, error } = await supabaseAdmin
    .from('wechat_users')
    .update(updateData)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;

  return {
    id: wechatUser.id,
    profileName: wechatUser.profile_name,
    profilePhone: wechatUser.profile_phone,
    profileAvatar: wechatUser.profile_avatar,
    profileIdNumber: wechatUser.profile_id_number,
    openid: wechatUser.openid,
    unionid: wechatUser.unionid,
    wechatNickname: wechatUser.wechat_nickname,
    wechatAvatarUrl: wechatUser.wechat_avatar_url,
    isActive: wechatUser.is_active,
    lastLoginAt: wechatUser.last_login_at ? new Date(wechatUser.last_login_at) : null,
    createdAt: new Date(wechatUser.created_at),
    updatedAt: new Date(wechatUser.updated_at)
  };
}

/**
 * Delete WeChat user using Supabase
 */
export async function deleteWechatUser(id: string) {
  const { data: wechatUser, error } = await supabaseAdmin
    .from('wechat_users')
    .delete()
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;

  return {
    id: wechatUser.id,
    profileName: wechatUser.profile_name,
    profilePhone: wechatUser.profile_phone,
    profileAvatar: wechatUser.profile_avatar,
    profileIdNumber: wechatUser.profile_id_number,
    openid: wechatUser.openid,
    unionid: wechatUser.unionid,
    wechatNickname: wechatUser.wechat_nickname,
    wechatAvatarUrl: wechatUser.wechat_avatar_url,
    isActive: wechatUser.is_active,
    lastLoginAt: wechatUser.last_login_at ? new Date(wechatUser.last_login_at) : null,
    createdAt: new Date(wechatUser.created_at),
    updatedAt: new Date(wechatUser.updated_at)
  };
}

/**
 * Find WeChat user by openid using Supabase
 */
export async function findByOpenid(openid: string) {
  const { data, error } = await supabaseAdmin
    .from('wechat_users')
    .select('*')
    .eq('openid', openid)
    .single();

  if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found

  if (!data) return null;

  return {
    id: data.id,
    profileName: data.profile_name,
    profilePhone: data.profile_phone,
    profileAvatar: data.profile_avatar,
    profileIdNumber: data.profile_id_number,
    openid: data.openid,
    unionid: data.unionid,
    wechatNickname: data.wechat_nickname,
    wechatAvatarUrl: data.wechat_avatar_url,
    isActive: data.is_active,
    lastLoginAt: data.last_login_at ? new Date(data.last_login_at) : null,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at)
  };
}

/**
 * Find WeChat user by unionid using Supabase
 */
export async function findByUnionid(unionid: string) {
  const { data, error } = await supabaseAdmin
    .from('wechat_users')
    .select('*')
    .eq('unionid', unionid)
    .single();

  if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found

  if (!data) return null;

  return {
    id: data.id,
    profileName: data.profile_name,
    profilePhone: data.profile_phone,
    profileAvatar: data.profile_avatar,
    profileIdNumber: data.profile_id_number,
    openid: data.openid,
    unionid: data.unionid,
    wechatNickname: data.wechat_nickname,
    wechatAvatarUrl: data.wechat_avatar_url,
    isActive: data.is_active,
    lastLoginAt: data.last_login_at ? new Date(data.last_login_at) : null,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at)
  };
}

/**
 * Update last login time using Supabase
 */
export async function updateLastLogin(id: string) {
  const { data, error } = await supabaseAdmin
    .from('wechat_users')
    .update({
      last_login_at: new Date().toISOString()
    })
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;

  return {
    id: data.id,
    profileName: data.profile_name,
    profilePhone: data.profile_phone,
    profileAvatar: data.profile_avatar,
    profileIdNumber: data.profile_id_number,
    openid: data.openid,
    unionid: data.unionid,
    wechatNickname: data.wechat_nickname,
    wechatAvatarUrl: data.wechat_avatar_url,
    isActive: data.is_active,
    lastLoginAt: data.last_login_at ? new Date(data.last_login_at) : null,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at)
  };
}

/**
 * Get WeChat user statistics using Supabase
 */
export async function getWechatUserStats() {
  const [totalResult, activeResult, loginResult] = await Promise.all([
    supabaseAdmin.from('wechat_users').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('wechat_users').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabaseAdmin.from('wechat_users').select('*', { count: 'exact', head: true })
      .not('openid', 'is', null)
      .not('last_login_at', 'is', null)
  ]);

  const totalWechatUsers = totalResult.count || 0;
  const activeWechatUsers = activeResult.count || 0;
  const wechatLoginCount = loginResult.count || 0;

  return {
    totalWechatUsers,
    activeWechatUsers,
    wechatLoginCount,
    inactiveWechatUsers: totalWechatUsers - activeWechatUsers,
  };
}

/**
 * Get WeChat user growth statistics using Supabase
 */
export async function getWechatUserGrowthStats() {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [totalResult, growthResult] = await Promise.all([
    supabaseAdmin.from('wechat_users').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('wechat_users').select('*', { count: 'exact', head: true })
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