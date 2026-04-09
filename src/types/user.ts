export type UserType = 'admin' | 'user';

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

export interface UserRole {
  id: string;
  name: string;
}

export interface UserResponse {
  id: string;
  username: string;
  email: string;
  userType: UserType;
  profileName: string | null;
  profilePhone: string | null;
  profileAvatar: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  roles?: UserRole[];
}
