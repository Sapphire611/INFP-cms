import mongoose, { Document, Schema, Model } from "mongoose";

// 性别类型
export type GenderType = "男" | "女";

// 入学状态类型
export type EnrollmentStatusType = "在读" | "休学" | "转学" | "毕业";

// 家长关系类型
export type ParentRelationshipType =
  | "父亲"
  | "母亲"
  | "爷爷"
  | "奶奶"
  | "外公"
  | "外婆"
  | "其他监护人";

// 家长信息接口
export interface IParent {
  user: mongoose.Types.ObjectId;
  relationship: ParentRelationshipType;
  isPrimary: boolean;
}

// 学习进度接口
export interface ILearningProgress {
  totalLessons: number;
  completedLessons: number;
  totalStars: number;
  currentLevel: string;
}

// 紧急联系人接口
export interface IEmergencyContact {
  name?: string;
  phone?: string;
  relationship?: string;
}

// 健康信息接口
export interface IHealthInfo {
  allergies?: string[];
  specialNeeds?: string;
  emergencyContact?: IEmergencyContact;
}

// 入学信息接口
export interface IEnrollment {
  startDate: Date;
  status: EnrollmentStatusType;
}

// 学生文档接口
export interface IChild extends Document {
  name: string;
  gender: GenderType;
  birthDate: Date;
  studentId: string;
  avatar?: string;
  class: mongoose.Types.ObjectId;
  parents: IParent[];
  learningProgress: ILearningProgress;
  notes?: string;
  healthInfo?: IHealthInfo;
  enrollment: IEnrollment;
  createdAt: Date;
  updatedAt: Date;

  // 虚拟属性
  age: number;

  // 实例方法
  getCompletionRate(): number;
  addStars(count?: number): Promise<IChild>;
}

// 学生模型接口（包含静态方法）
export interface IChildModel extends Model<IChild> {
  findByClass(classId: mongoose.Types.ObjectId | string): Promise<IChild[]>;
}

// 学生Schema
const ChildSchema: Schema = new Schema(
  {
    // 学生基本信息
    name: {
      type: String,
      required: true,
      trim: true,
    },

    // 性别
    gender: {
      type: String,
      required: true,
      enum: ["男", "女"],
    },

    // 出生日期
    birthDate: {
      type: Date,
      required: true,
    },

    // 学号
    studentId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    // 头像
    avatar: {
      type: String,
      default: "",
    },

    // 所属班级
    class: {
      type: Schema.Types.ObjectId,
      ref: "Class",
      required: true,
    },

    // 家长信息
    parents: [
      {
        user: {
          type: Schema.Types.ObjectId,
          ref: "User",
        },
        relationship: {
          type: String,
          enum: [
            "父亲",
            "母亲",
            "爷爷",
            "奶奶",
            "外公",
            "外婆",
            "其他监护人",
          ],
        },
        isPrimary: {
          type: Boolean,
          default: false,
        },
      },
    ],

    // 学习进度
    learningProgress: {
      totalLessons: {
        type: Number,
        default: 0,
      },
      completedLessons: {
        type: Number,
        default: 0,
      },
      totalStars: {
        type: Number,
        default: 0,
      },
      currentLevel: {
        type: String,
        default: "Beginner",
      },
    },

    // 特殊说明
    notes: {
      type: String,
      maxlength: 500,
    },

    // 健康信息
    healthInfo: {
      allergies: [String],
      specialNeeds: String,
      emergencyContact: {
        name: String,
        phone: String,
        relationship: String,
      },
    },

    // 入学信息
    enrollment: {
      startDate: {
        type: Date,
        required: true,
      },
      status: {
        type: String,
        enum: ["在读", "休学", "转学", "毕业"],
        default: "在读",
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// 更新时间戳
ChildSchema.pre("findOneAndUpdate", function () {
  this.set({ updatedAt: new Date() });
});

// 虚拟属性：年龄计算
ChildSchema.virtual("age").get(function (this: IChild) {
  const today = new Date();
  const birthDate = new Date(this.birthDate);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age--;
  }

  return age;
});

// 实例方法：获取学习完成率
ChildSchema.methods.getCompletionRate = function (): number {
  if (this.learningProgress.totalLessons === 0) return 0;
  return Math.round(
    (this.learningProgress.completedLessons /
      this.learningProgress.totalLessons) *
      100
  );
};

// 实例方法：添加星星
ChildSchema.methods.addStars = function (count = 1): Promise<IChild> {
  this.learningProgress.totalStars += count;
  return this.save();
};

// 静态方法：根据班级查找学生
ChildSchema.statics.findByClass = function (
  classId: mongoose.Types.ObjectId | string
) {
  return this.find({ class: classId }).populate("parents.user", "profile.name email");
};

// 导出模型
const Child: IChildModel =
  (mongoose.models.Child as IChildModel) ??
  mongoose.model<IChild, IChildModel>("Child", ChildSchema);

export default Child;
