import { UserResponse } from "@/types/user";

// 扩展的用户类型，包含回调函数
export interface UserWithCallback extends Omit<UserResponse, "createdAt" | "updatedAt"> {
  createdAt: string;
  updatedAt: string;
  onUserUpdated?: () => void;
}
