import mongoose, { Document, Schema, Model } from "mongoose";

// 作业类型
export type AssignmentType =
  | "video_recitation"
  | "audio_reading"
  | "photo_homework"
  | "parent_interaction";

// 作业状态
export type AssignmentStatus = "draft" | "published" | "closed" | "archived";

// 作业要求接口
export interface IAssignmentRequirements {
  description: string;
  type: AssignmentType;
  minDuration?: number; // 最短时长（秒）
  maxFileSize?: number; // 最大文件大小（字节）
  guidelines: string[]; // 具体指导
}

// 时间安排接口
export interface IAssignmentSchedule {
  publishDate: Date;
  dueDate: Date;
  isImmediate: boolean;
}

// 评分设置接口
export interface IAssignmentGrading {
  maxStars: number;
  criteria: string[];
  autoGrading: boolean;
}

// 提交统计接口
export interface IAssignmentSubmissions {
  total: number;
  completed: number;
  pending: number;
  graded: number;
}

// 提醒设置接口
export interface IAssignmentReminders {
  enabled: boolean;
  times: Date[]; // 提醒时间点
}

// 作业文档接口
export interface IAssignment extends Document {
  title: string;
  course: mongoose.Types.ObjectId;
  targetClass: mongoose.Types.ObjectId;
  teacher: mongoose.Types.ObjectId;
  requirements: IAssignmentRequirements;
  schedule: IAssignmentSchedule;
  grading: IAssignmentGrading;
  status: AssignmentStatus;
  submissions: IAssignmentSubmissions;
  notes?: string;
  reminders: IAssignmentReminders;
  createdAt: Date;
  updatedAt: Date;

  // 虚拟属性
  isOverdue: boolean;
  completionRate: number;

  // 实例方法
  updateSubmissionStats(): Promise<IAssignment>;
}

// 作业Model接口
export interface IAssignmentModel extends Model<IAssignment> {
  getActiveByClass(classId: mongoose.Types.ObjectId | string): Promise<IAssignment[]>;
  getByTeacher(
    teacherId: mongoose.Types.ObjectId | string,
    status?: AssignmentStatus | null
  ): Promise<IAssignment[]>;
}

// 作业Schema
const AssignmentSchema: Schema = new Schema({
  // 作业基本信息
  title: {
    type: String,
    required: true,
    trim: true,
  },

  // 关联课程
  course: {
    type: Schema.Types.ObjectId,
    ref: "Course",
    required: true,
  },

  // 发布班级
  targetClass: {
    type: Schema.Types.ObjectId,
    ref: "Class",
    required: true,
  },

  // 发布教师
  teacher: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  // 作业要求
  requirements: {
    description: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: [
        "video_recitation",
        "audio_reading",
        "photo_homework",
        "parent_interaction",
      ],
      default: "video_recitation",
    },
    minDuration: Number, // 最短时长（秒）
    maxFileSize: Number, // 最大文件大小（字节）
    guidelines: [String], // 具体指导
  },

  // 时间安排
  schedule: {
    publishDate: {
      type: Date,
      default: Date.now,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    isImmediate: {
      type: Boolean,
      default: true,
    },
  },

  // 评分设置
  grading: {
    maxStars: {
      type: Number,
      default: 5,
    },
    criteria: [String],
    autoGrading: {
      type: Boolean,
      default: false,
    },
  },

  // 作业状态
  status: {
    type: String,
    enum: ["draft", "published", "closed", "archived"],
    default: "published",
  },

  // 提交统计
  submissions: {
    total: {
      type: Number,
      default: 0,
    },
    completed: {
      type: Number,
      default: 0,
    },
    pending: {
      type: Number,
      default: 0,
    },
    graded: {
      type: Number,
      default: 0,
    },
  },

  // 额外说明
  notes: {
    type: String,
    maxlength: 500,
  },

  // 提醒设置
  reminders: {
    enabled: {
      type: Boolean,
      default: true,
    },
    times: [Date], // 提醒时间点
  },

  // 时间戳
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// 更新时间戳
AssignmentSchema.pre("findOneAndUpdate", function () {
  this.set({ updatedAt: new Date() });
});

// 索引
AssignmentSchema.index({ targetClass: 1, "schedule.publishDate": -1 });
AssignmentSchema.index({ teacher: 1, status: 1 });
AssignmentSchema.index({ "schedule.dueDate": 1 });

// 虚拟属性：是否过期
AssignmentSchema.virtual("isOverdue").get(function (this: IAssignment) {
  return new Date() > this.schedule.dueDate;
});

// 虚拟属性：完成率
AssignmentSchema.virtual("completionRate").get(function (this: IAssignment) {
  if (this.submissions.total === 0) return 0;
  return Math.round(
    (this.submissions.completed / this.submissions.total) * 100
  );
});

// 静态方法：获取班级的活跃作业
AssignmentSchema.statics.getActiveByClass = function (
  classId: mongoose.Types.ObjectId | string
) {
  return this.find({
    targetClass: classId,
    status: "published",
    "schedule.dueDate": { $gte: new Date() },
  })
    .populate("course teacher", "title profile.name")
    .sort({ "schedule.dueDate": 1 });
};

// 静态方法：获取教师的作业
AssignmentSchema.statics.getByTeacher = function (
  teacherId: mongoose.Types.ObjectId | string,
  status: AssignmentStatus | null = null
) {
  const query: any = { teacher: teacherId };
  if (status) query.status = status;

  return this.find(query)
    .populate("targetClass course", "name title")
    .sort({ "schedule.publishDate": -1 });
};

// 实例方法：更新提交统计
AssignmentSchema.methods.updateSubmissionStats = async function (
  this: IAssignment
): Promise<IAssignment> {
  const CheckIn = mongoose.model("CheckIn");

  const stats = await CheckIn.aggregate([
    { $match: { assignment: this._id } },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
      },
    },
  ]);

  // 重置统计
  this.submissions.completed = 0;
  this.submissions.pending = 0;
  this.submissions.graded = 0;

  // 更新统计
  stats.forEach((stat) => {
    switch (stat._id) {
      case "completed":
        this.submissions.completed = stat.count;
        break;
      case "pending":
        this.submissions.pending = stat.count;
        break;
      case "graded":
        this.submissions.graded = stat.count;
        break;
    }
  });

  this.submissions.total =
    this.submissions.completed +
    this.submissions.pending +
    this.submissions.graded;

  return this.save();
};

// 导出模型
const Assignment: IAssignmentModel =
  (mongoose.models.Assignment as IAssignmentModel) ??
  mongoose.model<IAssignment, IAssignmentModel>("Assignment", AssignmentSchema);

export default Assignment;
