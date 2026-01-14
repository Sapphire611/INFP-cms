import { IWechatUser } from "../models/wechatUser";

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

// 微信用户响应
export interface WechatUserResponse {
  _id: string;
  profile: {
    name: string;
    phone?: string;
    avatar?: string;
    idNumber?: string;
  };
  openid?: string;
  wechatInfo?: {
    nickname?: string;
    avatarUrl?: string;
  };
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}
