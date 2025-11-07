import mongoose, { Document, Schema, Model } from "mongoose";

// 班级年级类型
export type GradeType = "小班" | "中班" | "大班" | "学前班";

// 学期类型
export type SemesterType = "春季" | "秋季";

// 教师角色类型
export type TeacherRoleType = "班主任" | "任课老师";

// 教师关联接口
export interface IClassTeacher {
  teacher: mongoose.Types.ObjectId;
  role: TeacherRoleType;
  isPrimary: boolean;
  assignedAt: Date;
}

// 班级学期信息
export interface IAcademic {
  year: string;
  semester: SemesterType;
}

// 班级课程安排
export interface ISchedule {
  startDate?: Date;
  endDate?: Date;
  weekdays?: number[]; // 0-6 代表周日到周六
  lessonTime?: string;
}

// 班级文档接口
export interface IClass extends Document {
  name: string;
  grade: GradeType;
  classCode: string;
  teachers: IClassTeacher[];
  students: mongoose.Types.ObjectId[];
  academic: IAcademic;
  schedule: ISchedule;
  isActive: boolean;
  capacity: number;
  description?: string;
  createdAt: Date;
  updatedAt: Date;

  // 实例方法
  getStudentCount(): number;
  getClassTeacher(): IClassTeacher | undefined;
  isFull(): boolean;
  getAvailableCapacity(): number;
}

// 班级模型接口（包含静态方法）
export interface IClassModel extends Model<IClass> {
  findByTeacher(teacherId: mongoose.Types.ObjectId | string): Promise<IClass[]>;
  findByClassTeacher(
    teacherId: mongoose.Types.ObjectId | string
  ): Promise<IClass[]>;
}

// 班级Schema
const ClassSchema: Schema = new Schema(
  {
    // 班级基本信息
    name: {
      type: String,
      required: true,
      trim: true,
    },

    // 年级信息
    grade: {
      type: String,
      required: true,
      enum: ["小班", "中班", "大班", "学前班"],
    },

    // 班级代码
    classCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    // 任课教师和班主任
    teachers: [
      {
        teacher: {
          type: Schema.Types.ObjectId,
          ref: "User",
          required: true,
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

    // 班级学生
    students: [
      {
        type: Schema.Types.ObjectId,
        ref: "Child",
      },
    ],

    // 学期信息
    academic: {
      year: {
        type: String,
        required: true,
      },
      semester: {
        type: String,
        required: true,
        enum: ["春季", "秋季"],
      },
    },

    // 课程安排
    schedule: {
      startDate: Date,
      endDate: Date,
      weekdays: [Number], // 0-6 代表周日到周六
      lessonTime: String,
    },

    // 班级状态
    isActive: {
      type: Boolean,
      default: true,
    },

    // 班级容量
    capacity: {
      type: Number,
      default: 30,
      min: 1,
      max: 50,
    },

    // 班级描述
    description: {
      type: String,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
  }
);

// 更新时间戳
ClassSchema.pre("findOneAndUpdate", function () {
  this.set({ updatedAt: new Date() });
});

// 静态方法：根据教师ID查找班级
ClassSchema.statics.findByTeacher = function (
  teacherId: mongoose.Types.ObjectId | string
) {
  return this.find({ "teachers.teacher": teacherId })
    .populate("students")
    .populate("teachers.teacher", "profile.name email");
};

// 静态方法：根据班主任ID查找班级
ClassSchema.statics.findByClassTeacher = function (
  teacherId: mongoose.Types.ObjectId | string
) {
  return this.find({
    "teachers.teacher": teacherId,
    "teachers.isPrimary": true,
  })
    .populate("students")
    .populate("teachers.teacher", "profile.name email");
};

// 实例方法：获取班级学生数量
ClassSchema.methods.getStudentCount = function (): number {
  return this.students.length;
};

// 实例方法：获取班主任信息
ClassSchema.methods.getClassTeacher = function ():
  | IClassTeacher
  | undefined {
  return this.teachers.find(
    (t: IClassTeacher) => t.isPrimary && t.role === "班主任"
  );
};

// 实例方法：检查班级是否已满
ClassSchema.methods.isFull = function (): boolean {
  return this.students.length >= this.capacity;
};

// 实例方法：获取可用容量
ClassSchema.methods.getAvailableCapacity = function (): number {
  return Math.max(0, this.capacity - this.students.length);
};

// 导出模型
const Class: IClassModel =
  (mongoose.models.Class as IClassModel) ??
  mongoose.model<IClass, IClassModel>("Class", ClassSchema);

export default Class;
