// 创建微信用户请求
export interface CreateWechatUserRequest {
  profile: {
    name: string;
    phone?: string;
    idNumber?: string;
  };
  openid?: string;
  wechatInfo?: {
    nickname?: string;
    avatarUrl?: string;
  };
}

// 更新微信用户请求
export interface UpdateWechatUserRequest {
  profile?: {
    name?: string;
    phone?: string;
    idNumber?: string;
  };
  isActive?: boolean;
  wechatInfo?: {
    nickname?: string;
    avatarUrl?: string;
  };
}

// 微信用户响应（匹配扁平化的数据库结构）
export interface WechatUserResponse {
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
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}
