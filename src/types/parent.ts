import { IParent } from "../models/parent";

// 创建家长请求
export interface CreateParentRequest {
  profile: {
    name: string;
    phone?: string;
    idNumber?: string;
  };
  children?: string[]; // 子女ID数组
  openid?: string;
  wechatInfo?: {
    nickname?: string;
    avatarUrl?: string;
  };
}

// 更新家长请求
export interface UpdateParentRequest {
  profile?: {
    name?: string;
    phone?: string;
    idNumber?: string;
  };
  children?: string[];
  isActive?: boolean;
  wechatInfo?: {
    nickname?: string;
    avatarUrl?: string;
  };
}

// 家长响应
export interface ParentResponse {
  _id: string;
  profile: {
    name: string;
    phone?: string;
    avatar?: string;
    idNumber?: string;
  };
  children: string[];
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
