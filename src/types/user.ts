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
  teacherInfo?: {
    teacherId?: string;
    subjects?: string[];
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
  teacherInfo?: {
    teacherId?: string;
    subjects?: string[];
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
  teacherInfo?: {
    teacherId?: string;
    classes: any[];
    subjects: string[];
    classTeacherInfo: {
      totalClasses: number;
      totalStudents: number;
    };
  };
  parentInfo?: {
    children: string[];
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
