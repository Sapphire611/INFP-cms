import mongoose, { Document, Schema, Model } from "mongoose";
import bcrypt from "bcryptjs";

// 用户类型定义
export type UserType = "admin" | "user";

// 用户个人信息接口
export interface IProfile {
  name: string;
  phone?: string;
  avatar?: string;
}

// 用户文档接口
export interface IUser extends Document {
  username: string;
  email: string;
  password: string;
  userType: UserType;
  profile: IProfile;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;

  // 实例方法
  comparePassword(candidatePassword: string): Promise<boolean>;
}

// 用户Schema
const UserSchema: Schema = new Schema(
  {
    // 用户基本信息
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 2,
      maxlength: 20,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },

    // 用户类型
    userType: {
      type: String,
      required: true,
      enum: ["admin", "user"],
    },

    // 个人信息
    profile: {
      name: {
        type: String,
        required: true,
        trim: true,
      },
      phone: {
        type: String,
        trim: true,
      },
      avatar: {
        type: String,
        default: "",
      },
    },

    // 账户状态
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    bufferTimeoutMS: 30000,
  }
);

// 密码加密中间件
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(String(this.password), salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

// 更新时间戳
UserSchema.pre("findOneAndUpdate", function () {
  this.set({ updatedAt: new Date() });
});

// 密码验证方法
UserSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// 返回用户信息（不包含敏感数据）
UserSchema.methods.toJSON = function () {
  const userObject = this.toObject();
  delete userObject.password;
  return userObject;
};

// 导出模型
const User: Model<IUser> =
  mongoose.models.User ?? mongoose.model<IUser>("User", UserSchema);

export default User;