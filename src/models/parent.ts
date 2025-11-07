import mongoose, { Document, Schema, Model } from "mongoose";

// 家长基本信息接口
export interface IParentProfile {
  name: string;
  phone?: string;
  avatar?: string;
  idNumber?: string; // 身份证号（可选）
}

// 家长文档接口
export interface IParent extends Document {
  profile: IParentProfile;
  children: mongoose.Types.ObjectId[]; // 关联的学生
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

  // 实例方法
  addChild(childId: mongoose.Types.ObjectId | string): Promise<IParent>;
  removeChild(childId: mongoose.Types.ObjectId | string): Promise<IParent>;
  hasChild(childId: mongoose.Types.ObjectId | string): boolean;
}

// 家长模型接口（包含静态方法）
export interface IParentModel extends Model<IParent> {
  findByOpenid(openid: string): Promise<IParent | null>;
  findByChild(childId: mongoose.Types.ObjectId | string): Promise<IParent[]>;
}

// 家长Schema
const ParentSchema: Schema = new Schema(
  {
    // 家长基本信息
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

    // 关联的学生
    children: [
      {
        type: Schema.Types.ObjectId,
        ref: "Child",
      },
    ],

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
ParentSchema.pre("findOneAndUpdate", function () {
  this.set({ updatedAt: new Date() });
});

// 返回家长信息（不包含敏感数据）
ParentSchema.methods.toJSON = function () {
  const parentObject = this.toObject();
  // 可以根据需要移除敏感字段
  return parentObject;
};

// 实例方法：添加孩子
ParentSchema.methods.addChild = function (
  childId: mongoose.Types.ObjectId | string
): Promise<IParent> {
  if (!this.children.includes(childId as any)) {
    this.children.push(childId as mongoose.Types.ObjectId);
  }
  return this.save();
};

// 实例方法：移除孩子
ParentSchema.methods.removeChild = function (
  childId: mongoose.Types.ObjectId | string
): Promise<IParent> {
  this.children = this.children.filter(
    (child: mongoose.Types.ObjectId) => child.toString() !== childId.toString()
  );
  return this.save();
};

// 实例方法：检查是否有某个孩子
ParentSchema.methods.hasChild = function (
  childId: mongoose.Types.ObjectId | string
): boolean {
  return this.children.some(
    (child: mongoose.Types.ObjectId) => child.toString() === childId.toString()
  );
};

// 静态方法：根据 openid 查找家长
ParentSchema.statics.findByOpenid = function (openid: string) {
  return this.findOne({ openid }).populate("children");
};

// 静态方法：根据孩子ID查找家长
ParentSchema.statics.findByChild = function (
  childId: mongoose.Types.ObjectId | string
) {
  return this.find({ children: childId }).populate("children");
};

// 导出模型
const Parent: IParentModel =
  (mongoose.models.Parent as IParentModel) ??
  mongoose.model<IParent, IParentModel>("Parent", ParentSchema);

export default Parent;
