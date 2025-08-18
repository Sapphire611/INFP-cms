import { IUser } from "../models/user";

export interface CreateUserRequest {
  name: string;
  email: string;
  password: string;
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  password?: string;
}

export interface UserResponse extends IUser {
  _id: string;
}
