import { IUser, UserType } from "../models/user";

export interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  userType: UserType;
  profile: {
    name: string;
    phone?: string;
  };
}

export interface UpdateUserRequest {
  username?: string;
  email?: string;
  password?: string;
  userType?: UserType;
  profile?: {
    name?: string;
    phone?: string;
  };
}

export interface UserResponse {
  _id: string;
  username: string;
  email: string;
  userType: UserType;
  profile: {
    name: string;
    phone?: string;
    avatar?: string;
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
