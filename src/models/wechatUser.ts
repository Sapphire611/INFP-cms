import mongoose, { Document, Schema, Model } from "mongoose";

// 微信用户基本信息接口
export interface IWechatUserProfile {
  name: string;
  phone?: string;
  avatar?: string;
  idNumber?: string; // 身份证号（可选）
}

// 微信用户文档接口
export interface IWechatUser extends Document {
  profile: IWechatUserProfile;
  openid?: string; // 微信小程序 openid
  unionid?: string; // 微信开放平台 unionid
  wechatInfo?: {
    nickname?: string;
    avatarUrl?: string;
  };
  isActive: boolean; // 账户是否激活
  lastLoginAt?: Date; // 最后登录时间（微信小程序）
  createdAt: Date;
  updatedAt: Date;
}

// 微信用户模型接口（包含静态方法）
export interface IWechatUserModel extends Model<IWechatUser> {
  findByOpenid(openid: string): Promise<IWechatUser | null>;
}

// 微信用户Schema
const WechatUserSchema: Schema = new Schema(
  {
    // 微信用户基本信息
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
      idNumber: {
        type: String,
        trim: true,
      },
    },

    // 微信相关信息
    openid: {
      type: String,
      unique: true,
      sparse: true, // 允许多个 null 值
      index: true,
    },

    unionid: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },

    wechatInfo: {
      nickname: String,
      avatarUrl: String,
    },

    // 账户状态
    isActive: {
      type: Boolean,
      default: true,
    },

    // 最后登录时间
    lastLoginAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// 更新时间戳
WechatUserSchema.pre("findOneAndUpdate", function () {
  this.set({ updatedAt: new Date() });
});

// 返回微信用户信息（不包含敏感数据）
WechatUserSchema.methods.toJSON = function () {
  const wechatUserObject = this.toObject();
  return wechatUserObject;
};

// 静态方法：根据 openid 查找微信用户
WechatUserSchema.statics.findByOpenid = function (openid: string) {
  return this.findOne({ openid });
};

// 导出模型
const WechatUser: IWechatUserModel =
  (mongoose.models.WechatUser as IWechatUserModel) ??
  mongoose.model<IWechatUser, IWechatUserModel>("WechatUser", WechatUserSchema);

export default WechatUser;
