import mongoose, { Document, Schema, Model } from "mongoose";

// 打卡状态类型
export type CheckInStatus = "pending" | "completed" | "graded" | "returned";

// 媒体文件类型
export type MediaFileType = "video" | "audio" | "image";

// 媒体文件接口
export interface IMediaFile {
  type: MediaFileType;
  url: string;
  filename: string;
  size: number; // 文件大小（字节）
  duration?: number; // 时长（秒，仅适用于视频/音频）
  thumbnail?: string; // 缩略图（仅适用于视频）
}

// 提交内容接口
export interface ISubmission {
  mediaFiles: IMediaFile[];
  description?: string;
  parentNotes?: string;
}

// 教师评价接口
export interface IEvaluation {
  stars: number;
  audioFeedback?: {
    url: string;
    duration: number;
  };
  textFeedback?: string;
  gradedBy?: mongoose.Types.ObjectId;
  gradedAt?: Date;
  isExcellent: boolean;
}

// 点赞接口
export interface ILike {
  user: mongoose.Types.ObjectId;
  createdAt: Date;
}

// 评论接口
export interface IComment {
  user: mongoose.Types.ObjectId;
  content: string;
  createdAt: Date;
}

// 时间记录接口
export interface ICheckInTimestamps {
  submittedAt: Date;
  lastModified: Date;
}

// 技术信息接口
export interface ICheckInMetadata {
  submissionDevice?: string;
  ipAddress?: string;
  userAgent?: string;
}

// 打卡文档接口
export interface ICheckIn extends Document {
  assignment: mongoose.Types.ObjectId;
  student: mongoose.Types.ObjectId;
  submittedBy: mongoose.Types.ObjectId;
  submission: ISubmission;
  status: CheckInStatus;
  evaluation: IEvaluation;
  likes: ILike[];
  comments: IComment[];
  timestamps: ICheckInTimestamps;
  metadata: ICheckInMetadata;

  // 虚拟属性
  isGraded: boolean;
  isOnTime: boolean;

  // 实例方法
  addEvaluation(
    evaluation: Partial<IEvaluation>,
    teacherId: mongoose.Types.ObjectId | string
  ): Promise<ICheckIn>;
  processStarRewards(): Promise<any>;
  processCheckInReward(): Promise<any>;
  getScore(): number;
}

// 打卡Model接口
export interface ICheckInModel extends Model<ICheckIn> {
  getByClass(
    classId: mongoose.Types.ObjectId | string,
    options?: any
  ): Promise<any[]>;
  getByStudent(
    studentId: mongoose.Types.ObjectId | string,
    limit?: number
  ): Promise<ICheckIn[]>;
  getPendingGrading(
    teacherId: mongoose.Types.ObjectId | string
  ): Promise<ICheckIn[]>;
}

// 打卡Schema
const CheckInSchema: Schema = new Schema({
  // 关联作业
  assignment: {
    type: Schema.Types.ObjectId,
    ref: "Assignment",
    required: true,
  },

  // 提交学生
  student: {
    type: Schema.Types.ObjectId,
    ref: "Child",
    required: true,
  },

  // 提交家长
  submittedBy: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  // 提交内容
  submission: {
    // 媒体文件
    mediaFiles: [
      {
        type: {
          type: String,
          enum: ["video", "audio", "image"],
          required: true,
        },
        url: {
          type: String,
          required: true,
        },
        filename: String,
        size: Number, // 文件大小（字节）
        duration: Number, // 时长（秒，仅适用于视频/音频）
        thumbnail: String, // 缩略图（仅适用于视频）
      },
    ],

    // 文字描述
    description: {
      type: String,
      maxlength: 500,
    },

    // 家长备注
    parentNotes: {
      type: String,
      maxlength: 200,
    },
  },

  // 提交状态
  status: {
    type: String,
    enum: ["pending", "completed", "graded", "returned"],
    default: "completed",
  },

  // 教师评价
  evaluation: {
    // 评分（星星数）
    stars: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
    },

    // 语音点评
    audioFeedback: {
      url: String,
      duration: Number,
    },

    // 文字评语
    textFeedback: {
      type: String,
      maxlength: 300,
    },

    // 评价教师
    gradedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },

    // 评价时间
    gradedAt: Date,

    // 是否优秀作品
    isExcellent: {
      type: Boolean,
      default: false,
    },
  },

  // 点赞（支持教师端先使用，后续可扩展）
  likes: [
    {
      user: { type: Schema.Types.ObjectId, ref: "User" },
      createdAt: { type: Date, default: Date.now },
    },
  ],

  // 评论（简易版：一段文字 + 用户 + 时间）
  comments: [
    {
      user: { type: Schema.Types.ObjectId, ref: "User" },
      content: { type: String, maxlength: 300 },
      createdAt: { type: Date, default: Date.now },
    },
  ],

  // 时间记录
  timestamps: {
    submittedAt: {
      type: Date,
      default: Date.now,
    },
    lastModified: {
      type: Date,
      default: Date.now,
    },
  },

  // 技术信息
  metadata: {
    submissionDevice: String, // 提交设备信息
    ipAddress: String,
    userAgent: String,
  },
});

// 更新最后修改时间
CheckInSchema.pre("findOneAndUpdate", function () {
  this.set({ "timestamps.lastModified": new Date() });
});

// 索引
CheckInSchema.index({ assignment: 1, student: 1 });
CheckInSchema.index({ submittedBy: 1, "timestamps.submittedAt": -1 });
CheckInSchema.index({ status: 1 });
CheckInSchema.index({ "evaluation.gradedBy": 1, "evaluation.gradedAt": -1 });

// 复合唯一索引：一个学生对同一作业只能提交一次
CheckInSchema.index({ assignment: 1, student: 1 }, { unique: true });

// 虚拟属性：是否已评分
CheckInSchema.virtual("isGraded").get(function (this: ICheckIn) {
  return this.status === "graded" && this.evaluation.stars > 0;
});

// 虚拟属性：提交是否及时
CheckInSchema.virtual("isOnTime").get(function (this: ICheckIn) {
  if (!this.populated("assignment") || !(this.assignment as any).schedule)
    return true;
  return (
    this.timestamps.submittedAt <= (this.assignment as any).schedule.dueDate
  );
});

// 静态方法：获取班级的打卡记录
CheckInSchema.statics.getByClass = function (
  classId: mongoose.Types.ObjectId | string,
  options: any = {}
) {
  const query: any[] = [
    {
      $lookup: {
        from: "children",
        localField: "student",
        foreignField: "_id",
        as: "studentInfo",
      },
    },
    {
      $match: {
        "studentInfo.class": new mongoose.Types.ObjectId(classId.toString()),
      },
    },
  ];

  if (options.status) {
    query.push({ $match: { status: options.status } });
  }

  if (options.assignment) {
    query.push({
      $match: {
        assignment: new mongoose.Types.ObjectId(options.assignment.toString()),
      },
    });
  }

  query.push({
    $sort: { "timestamps.submittedAt": -1 },
  });

  return this.aggregate(query);
};

// 静态方法：获取学生的打卡记录
CheckInSchema.statics.getByStudent = function (
  studentId: mongoose.Types.ObjectId | string,
  limit: number = 20
) {
  return this.find({ student: studentId })
    .populate("assignment", "title course schedule")
    .populate({
      path: "assignment",
      populate: {
        path: "course",
        select: "title level",
      },
    })
    .sort({ "timestamps.submittedAt": -1 })
    .limit(limit);
};

// 静态方法：获取待评分的打卡记录
CheckInSchema.statics.getPendingGrading = function (
  teacherId: mongoose.Types.ObjectId | string
) {
  return this.find({
    status: { $in: ["completed", "pending"] },
  })
    .populate({
      path: "assignment",
      match: { teacher: teacherId },
      select: "title targetClass",
    })
    .populate("student", "name avatar")
    .populate("submittedBy", "profile.name")
    .sort({ "timestamps.submittedAt": 1 });
};

// 实例方法：添加教师评价
CheckInSchema.methods.addEvaluation = async function (
  this: ICheckIn,
  evaluation: Partial<IEvaluation>,
  teacherId: mongoose.Types.ObjectId | string
): Promise<ICheckIn> {
  this.evaluation = {
    ...this.evaluation,
    ...evaluation,
    gradedBy: teacherId as mongoose.Types.ObjectId,
    gradedAt: new Date(),
  } as IEvaluation;
  this.status = "graded";

  await this.save();

  // 如果获得星星，自动处理星星奖励系统
  if (evaluation.stars && evaluation.stars > 0) {
    await this.processStarRewards();
  }

  return this;
};

// 实例方法：处理星星奖励
CheckInSchema.methods.processStarRewards = async function (this: ICheckIn) {
  const StarAchievement = mongoose.model("StarAchievement");
  const StarLevel = mongoose.model("StarLevel");
  const Child = mongoose.model("Child");

  try {
    // 创建星星成就记录
    const achievement = new StarAchievement({
      student: this.student,
      checkIn: this._id,
      type: this.evaluation.isExcellent
        ? "excellent_performance"
        : "homework_completion",
      starsEarned: this.evaluation.stars,
      title: this.evaluation.isExcellent ? "优秀作品" : "作业完成",
      description: `在"${
        (this.populated("assignment") as any)?.title || "作业"
      }"中获得${this.evaluation.stars}颗星星`,
      level:
        this.evaluation.stars >= 5
          ? "gold"
          : this.evaluation.stars >= 3
          ? "silver"
          : "bronze",
      relatedAssignment: this.assignment,
    });

    await achievement.save();

    // 更新学生星星等级
    let starLevel = await StarLevel.findOne({ student: this.student });
    if (!starLevel) {
      starLevel = new StarLevel({ student: this.student });
    }

    await starLevel.addStars(this.evaluation.stars);
    await starLevel.updateStreak();

    // 检查并奖励成就
    const StarLevelModel = StarLevel as any;
    const newAchievements = await StarLevelModel.checkAchievements(this.student);

    // 更新Child模型的星星总数
    await Child.findByIdAndUpdate(this.student, {
      $inc: { "learningProgress.totalStars": this.evaluation.stars },
    });

    return { achievement, starLevel, newAchievements };
  } catch (error) {
    console.error("处理星星奖励错误:", error);
    throw error;
  }
};

// 实例方法：处理打卡提交的自动奖励（不改变评分状态）
CheckInSchema.methods.processCheckInReward = async function (this: ICheckIn) {
  const StarAchievement = mongoose.model("StarAchievement");
  const StarLevel = mongoose.model("StarLevel");
  const Child = mongoose.model("Child");

  try {
    const starsEarned = 1; // 每次打卡固定奖励1颗星

    // 创建星星成就记录
    const achievement = new StarAchievement({
      student: this.student,
      checkIn: this._id,
      type: "participation_reward", // 参与奖励
      starsEarned: starsEarned,
      title: "打卡完成",
      description: `完成"${
        (this.populated("assignment") as any)?.title || "任务"
      }"打卡`,
      level: "bronze",
      relatedAssignment: this.assignment,
    });

    await achievement.save();

    // 更新学生星星等级
    let starLevel = await StarLevel.findOne({ student: this.student });
    if (!starLevel) {
      starLevel = new StarLevel({ student: this.student });
    }

    await starLevel.addStars(starsEarned);
    await starLevel.updateStreak();

    // 检查并奖励成就
    const StarLevelModel = StarLevel as any;
    const newAchievements = await StarLevelModel.checkAchievements(this.student);

    // 更新Child模型的星星总数
    await Child.findByIdAndUpdate(this.student, {
      $inc: { "learningProgress.totalStars": starsEarned },
    });

    console.log(`学生 ${this.student} 打卡成功，获得 ${starsEarned} 颗星星`);

    return { achievement, starLevel, newAchievements, starsEarned };
  } catch (error) {
    console.error("处理打卡奖励错误:", error);
    throw error;
  }
};

// 实例方法：计算得分
CheckInSchema.methods.getScore = function (this: ICheckIn): number {
  if (!this.isGraded) return 0;
  return this.evaluation.stars;
};

// 导出模型
const CheckIn: ICheckInModel =
  (mongoose.models.CheckIn as ICheckInModel) ??
  mongoose.model<ICheckIn, ICheckInModel>("CheckIn", CheckInSchema);

export default CheckIn;
