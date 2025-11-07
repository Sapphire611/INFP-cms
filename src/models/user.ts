import mongoose, { Document, Schema, Model } from "mongoose";
import bcrypt from "bcryptjs";

// 用户类型定义
export type UserType = "admin" | "teacher" | "parent";

// 教师班级关联接口
export interface ITeacherClass {
  class: mongoose.Types.ObjectId;
  role: "班主任" | "任课老师";
  isPrimary: boolean;
  assignedAt: Date;
}

// 教师信息接口
export interface ITeacherInfo {
  teacherId?: string;
  classes: ITeacherClass[];
  subjects: string[];
  classTeacherInfo: {
    totalClasses: number;
    totalStudents: number;
  };
}

// 家长信息接口
export interface IParentInfo {
  children: mongoose.Types.ObjectId[];
}

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
  teacherInfo?: ITeacherInfo;
  parentInfo?: IParentInfo;
  isActive: boolean;
  openid?: string;
  createdAt: Date;
  updatedAt: Date;

  // 实例方法
  comparePassword(candidatePassword: string): Promise<boolean>;
  getManagedClasses(): ITeacherClass[];
  getClassTeacherClasses(): ITeacherClass[];
  isClassTeacherOf(classId: mongoose.Types.ObjectId | string): boolean;
  addClassManagement(
    classId: mongoose.Types.ObjectId | string,
    role?: "班主任" | "任课老师",
    isPrimary?: boolean
  ): void;
  removeClassManagement(classId: mongoose.Types.ObjectId | string): void;
  updateClassTeacherStats(): void;
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

    // 用户类型：admin, teacher 或 parent
    userType: {
      type: String,
      required: true,
      enum: ["admin", "teacher", "parent"],
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

    // 教师专属字段
    teacherInfo: {
      teacherId: String,
      classes: [
        {
          class: {
            type: Schema.Types.ObjectId,
            ref: "Class",
          },
          role: {
            type: String,
            enum: ["班主任", "任课老师"],
            default: "任课老师",
          },
          isPrimary: {
            type: Boolean,
            default: false,
          },
          assignedAt: {
            type: Date,
            default: Date.now,
          },
        },
      ],
      subjects: [String],
      // 班主任特有信息
      classTeacherInfo: {
        totalClasses: {
          type: Number,
          default: 0,
        },
        totalStudents: {
          type: Number,
          default: 0,
        },
      },
    },

    // 家长专属字段
    parentInfo: {
      children: [
        {
          type: Schema.Types.ObjectId,
          ref: "Child",
        },
      ],
    },

    // 账户状态
    isActive: {
      type: Boolean,
      default: true,
    },

    // 微信小程序相关
    openid: {
      type: String,
      unique: true,
      sparse: true,
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
  delete userObject.openid;
  return userObject;
};

// 实例方法：获取教师管理的班级
UserSchema.methods.getManagedClasses = function (): ITeacherClass[] {
  if (this.userType !== "teacher" || !this.teacherInfo) {
    return [];
  }
  return this.teacherInfo.classes;
};

// 实例方法：获取班主任班级
UserSchema.methods.getClassTeacherClasses = function (): ITeacherClass[] {
  if (this.userType !== "teacher" || !this.teacherInfo) {
    return [];
  }
  return this.teacherInfo.classes.filter(
    (c: ITeacherClass) => c.role === "班主任" && c.isPrimary
  );
};

// 实例方法：检查是否为某个班级的班主任
UserSchema.methods.isClassTeacherOf = function (
  classId: mongoose.Types.ObjectId | string
): boolean {
  if (this.userType !== "teacher" || !this.teacherInfo) {
    return false;
  }
  return this.teacherInfo.classes.some(
    (c: ITeacherClass) =>
      c.class.toString() === classId.toString() &&
      c.role === "班主任" &&
      c.isPrimary
  );
};

// 实例方法：添加班级管理权限
UserSchema.methods.addClassManagement = function (
  classId: mongoose.Types.ObjectId | string,
  role: "班主任" | "任课老师" = "任课老师",
  isPrimary = false
) {
  if (this.userType !== "teacher" || !this.teacherInfo) {
    throw new Error("只有教师才能管理班级");
  }

  // 检查是否已存在
  const existingIndex = this.teacherInfo.classes.findIndex(
    (c: ITeacherClass) => c.class.toString() === classId.toString()
  );

  if (existingIndex >= 0) {
    // 更新现有记录
    this.teacherInfo.classes[existingIndex].role = role;
    this.teacherInfo.classes[existingIndex].isPrimary = isPrimary;
  } else {
    // 添加新记录
    this.teacherInfo.classes.push({
      class: classId as mongoose.Types.ObjectId,
      role,
      isPrimary,
      assignedAt: new Date(),
    });
  }

  // 如果是班主任，更新统计信息
  if (role === "班主任" && isPrimary) {
    this.updateClassTeacherStats();
  }
};

// 实例方法：移除班级管理权限
UserSchema.methods.removeClassManagement = function (
  classId: mongoose.Types.ObjectId | string
) {
  if (this.userType !== "teacher" || !this.teacherInfo) {
    return;
  }

  this.teacherInfo.classes = this.teacherInfo.classes.filter(
    (c: ITeacherClass) => c.class.toString() !== classId.toString()
  );

  // 更新统计信息
  this.updateClassTeacherStats();
};

// 实例方法：更新班主任统计信息
UserSchema.methods.updateClassTeacherStats = function () {
  if (this.userType !== "teacher" || !this.teacherInfo) {
    return;
  }

  const classTeacherClasses = this.getClassTeacherClasses();
  this.teacherInfo.classTeacherInfo.totalClasses = classTeacherClasses.length;
};

// 导出模型
const User: Model<IUser> =
  mongoose.models.User ?? mongoose.model<IUser>("User", UserSchema);

export default User;
