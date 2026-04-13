import { supabaseAdmin } from '@/lib/supabase-admin';

export interface CreateWechatUserRequest {
  profileName: string;
  profilePhone?: string;
  profileAvatar?: string;
  profileIdNumber?: string;
  openid?: string;
  unionid?: string;
  wechatNickname?: string;
  wechatAvatarUrl?: string;
  mbti?: string;
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
  mbti?: string;
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
  mbti: string | null;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

function transform(user: any): WechatUser {
  return {
    id: user.id,
    profileName: user.profile_name,
    profilePhone: user.profile_phone,
    profileAvatar: user.profile_avatar,
    profileIdNumber: user.profile_id_number,
    openid: user.openid,
    unionid: user.unionid,
    wechatNickname: user.wechat_nickname,
    wechatAvatarUrl: user.wechat_avatar_url,
    mbti: user.mbti ?? null,
    isActive: user.is_active,
    lastLoginAt: user.last_login_at ? new Date(user.last_login_at) : null,
    createdAt: new Date(user.created_at),
    updatedAt: new Date(user.updated_at),
  };
}

export async function findWechatUsers(
  query: FindWechatUsersQuery = {},
  pagination: PaginationOptions = { page: 1, pageSize: 10 }
) {
  const { search, isActive } = query;
  const { page, pageSize } = pagination;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let q = supabaseAdmin.from('wechat_users').select('*', { count: 'exact' });

  if (search) {
    q = q.or(`profile_name.ilike.%${search}%,profile_phone.ilike.%${search}%,wechat_nickname.ilike.%${search}%`);
  }
  if (isActive !== undefined) q = q.eq('is_active', isActive);

  q = q.order('created_at', { ascending: false }).range(from, to);

  const { data, error, count } = await q;
  if (error) throw error;

  return {
    wechatUsers: (data ?? []).map(transform),
    pagination: {
      page,
      pageSize,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / pageSize),
    },
  };
}

export async function findWechatUserById(id: string) {
  const { data, error } = await supabaseAdmin
    .from('wechat_users').select('*').eq('id', id).single();
  if (error && error.code !== 'PGRST116') throw error;
  return data ? transform(data) : null;
}

export async function createWechatUser(data: CreateWechatUserRequest) {
  const { data: user, error } = await supabaseAdmin
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
      mbti: data.mbti,
      is_active: data.isActive !== undefined ? data.isActive : true,
    })
    .select('*').single();
  if (error) throw error;
  return transform(user);
}

export async function updateWechatUser(id: string, data: UpdateWechatUserRequest) {
  const u: any = {};
  if (data.profileName !== undefined) u.profile_name = data.profileName;
  if (data.profilePhone !== undefined) u.profile_phone = data.profilePhone;
  if (data.profileAvatar !== undefined) u.profile_avatar = data.profileAvatar;
  if (data.profileIdNumber !== undefined) u.profile_id_number = data.profileIdNumber;
  if (data.openid !== undefined) u.openid = data.openid;
  if (data.unionid !== undefined) u.unionid = data.unionid;
  if (data.wechatNickname !== undefined) u.wechat_nickname = data.wechatNickname;
  if (data.wechatAvatarUrl !== undefined) u.wechat_avatar_url = data.wechatAvatarUrl;
  if (data.mbti !== undefined) u.mbti = data.mbti;
  if (data.isActive !== undefined) u.is_active = data.isActive;
  if (data.lastLoginAt !== undefined) u.last_login_at = data.lastLoginAt;

  const { data: user, error } = await supabaseAdmin
    .from('wechat_users').update(u).eq('id', id).select('*').single();
  if (error) throw error;
  return transform(user);
}

export async function deleteWechatUser(id: string) {
  const { data: user, error } = await supabaseAdmin
    .from('wechat_users').delete().eq('id', id).select('*').single();
  if (error) throw error;
  return transform(user);
}

export async function findByOpenid(openid: string) {
  const { data, error } = await supabaseAdmin
    .from('wechat_users').select('*').eq('openid', openid).single();
  if (error && error.code !== 'PGRST116') throw error;
  return data ? transform(data) : null;
}

export async function findByUnionid(unionid: string) {
  const { data, error } = await supabaseAdmin
    .from('wechat_users').select('*').eq('unionid', unionid).single();
  if (error && error.code !== 'PGRST116') throw error;
  return data ? transform(data) : null;
}

export async function updateLastLogin(id: string) {
  const { data, error } = await supabaseAdmin
    .from('wechat_users')
    .update({ last_login_at: new Date().toISOString() })
    .eq('id', id).select('*').single();
  if (error) throw error;
  return transform(data);
}

export async function getWechatUserStats() {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const [totalResult, activeResult, loginResult] = await Promise.all([
    supabaseAdmin.from('wechat_users').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('wechat_users').select('*', { count: 'exact', head: true })
      .gte('last_login_at', sevenDaysAgo.toISOString()),
    supabaseAdmin.from('wechat_users').select('*', { count: 'exact', head: true })
      .not('openid', 'is', null).not('last_login_at', 'is', null),
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

export async function getWechatUserGrowthStats() {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [totalResult, growthResult] = await Promise.all([
    supabaseAdmin.from('wechat_users').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('wechat_users').select('*', { count: 'exact', head: true })
      .gte('created_at', thirtyDaysAgo.toISOString()),
  ]);

  const totalCount = totalResult.count || 0;
  const last30DaysCount = growthResult.count || 0;

  return {
    total: totalCount,
    growth: last30DaysCount,
    growthRate: totalCount > 0 ? ((last30DaysCount / totalCount) * 100).toFixed(2) : '0.00',
  };
}
