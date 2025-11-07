import mongoose, { Document, Schema, Model } from "mongoose";

// 学习活动数据接口
export interface IActivities {
  checkIns: number;
  completedAssignments: number;
  starsEarned: number;
  studyTimeMinutes: number;
}

// 表现指标接口
export interface IPerformance {
  averageRating: number;
  excellentWorks: number;
  onTimeCompletionRate: number;
  activityScore: number;
}

// 设备类型接口
export interface IDeviceType {
  type: string;
  count: number;
}

// 学习偏好接口
export interface IPreferences {
  mostActiveHour?: number;
  favoriteSubjects: string[];
  deviceTypes: IDeviceType[];
}

// 学习分析文档接口
export interface ILearningAnalytics extends Document {
  student: mongoose.Types.ObjectId;
  class: mongoose.Types.ObjectId;
  date: Date;
  activities: IActivities;
  performance: IPerformance;
  preferences: IPreferences;
}

// 学习分析Model接口
export interface ILearningAnalyticsModel extends Model<ILearningAnalytics> {
  generateStudentAnalytics(
    studentId: mongoose.Types.ObjectId | string,
    date?: Date
  ): Promise<ILearningAnalytics>;
}

// 班级整体数据接口
export interface IClassMetrics {
  totalStudents: number;
  activeStudents: number;
  totalAssignments: number;
  totalSubmissions: number;
  classCompletionRate: number;
  averageClassRating: number;
}

// 需要关注的学生接口
export interface IStudentNeedAttention {
  student: mongoose.Types.ObjectId;
  reason: string; // 'low_activity', 'declining_performance', 'missed_deadlines'
  severity: "low" | "medium" | "high";
}

// 参与度分析接口
export interface IEngagement {
  highEngagement: number;
  mediumEngagement: number;
  lowEngagement: number;
  studentsNeedAttention: IStudentNeedAttention[];
}

// 趋势数据点接口
export interface ITrendDataPoint {
  date: Date;
  count?: number;
  average?: number;
  total?: number;
}

// 学习趋势接口
export interface ITrends {
  submissionTrend: ITrendDataPoint[];
  ratingTrend: ITrendDataPoint[];
  starsTrend: ITrendDataPoint[];
}

// 课程表现分析接口
export interface ISubjectPerformance {
  subject: string;
  averageRating: number;
  completionRate: number;
  studentEngagement: number;
}

// 班级分析文档接口
export interface IClassAnalytics extends Document {
  class: mongoose.Types.ObjectId;
  teacher: mongoose.Types.ObjectId;
  date: Date;
  classMetrics: IClassMetrics;
  engagement: IEngagement;
  trends: ITrends;
  subjectPerformance: ISubjectPerformance[];
}

// 班级分析Model接口
export interface IClassAnalyticsModel extends Model<IClassAnalytics> {
  generateClassAnalytics(
    classId: mongoose.Types.ObjectId | string,
    teacherId: mongoose.Types.ObjectId | string,
    date?: Date
  ): Promise<IClassAnalytics>;
}

// 学习分析Schema
const LearningAnalyticsSchema: Schema = new Schema({
  // 学生
  student: {
    type: Schema.Types.ObjectId,
    ref: "Child",
    required: true,
  },

  // 班级
  class: {
    type: Schema.Types.ObjectId,
    ref: "Class",
    required: true,
  },

  // 分析日期
  date: {
    type: Date,
    required: true,
  },

  // 学习活动数据
  activities: {
    // 打卡次数
    checkIns: {
      type: Number,
      default: 0,
    },

    // 完成的作业数
    completedAssignments: {
      type: Number,
      default: 0,
    },

    // 获得的星星数
    starsEarned: {
      type: Number,
      default: 0,
    },

    // 学习时长（分钟）
    studyTimeMinutes: {
      type: Number,
      default: 0,
    },
  },

  // 表现指标
  performance: {
    // 平均评分
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },

    // 优秀作品数
    excellentWorks: {
      type: Number,
      default: 0,
    },

    // 按时完成率
    onTimeCompletionRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    // 活跃度评分
    activityScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
  },

  // 学习偏好
  preferences: {
    // 最活跃的时间段
    mostActiveHour: Number,

    // 最喜欢的课程类型
    favoriteSubjects: [String],

    // 提交设备类型
    deviceTypes: [
      {
        type: String,
        count: Number,
      },
    ],
  },
});

// 索引
LearningAnalyticsSchema.index({ student: 1, date: -1 });
LearningAnalyticsSchema.index({ class: 1, date: -1 });
LearningAnalyticsSchema.index({ date: -1 });

// 班级分析Schema
const ClassAnalyticsSchema: Schema = new Schema({
  // 班级
  class: {
    type: Schema.Types.ObjectId,
    ref: "Class",
    required: true,
  },

  // 教师
  teacher: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  // 分析日期
  date: {
    type: Date,
    required: true,
  },

  // 班级整体数据
  classMetrics: {
    // 学生总数
    totalStudents: {
      type: Number,
      required: true,
    },

    // 活跃学生数
    activeStudents: {
      type: Number,
      default: 0,
    },

    // 总作业数
    totalAssignments: {
      type: Number,
      default: 0,
    },

    // 总提交数
    totalSubmissions: {
      type: Number,
      default: 0,
    },

    // 班级完成率
    classCompletionRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    // 平均评分
    averageClassRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
  },

  // 参与度分析
  engagement: {
    // 高活跃度学生数（每周3次以上）
    highEngagement: {
      type: Number,
      default: 0,
    },

    // 中等活跃度学生数（每周1-2次）
    mediumEngagement: {
      type: Number,
      default: 0,
    },

    // 低活跃度学生数（每周少于1次）
    lowEngagement: {
      type: Number,
      default: 0,
    },

    // 需要关注的学生
    studentsNeedAttention: [
      {
        student: {
          type: Schema.Types.ObjectId,
          ref: "Child",
        },
        reason: String, // 'low_activity', 'declining_performance', 'missed_deadlines'
        severity: {
          type: String,
          enum: ["low", "medium", "high"],
          default: "low",
        },
      },
    ],
  },

  // 学习趋势
  trends: {
    // 提交趋势（7天）
    submissionTrend: [
      {
        date: Date,
        count: Number,
      },
    ],

    // 评分趋势（7天）
    ratingTrend: [
      {
        date: Date,
        average: Number,
      },
    ],

    // 星星获得趋势（7天）
    starsTrend: [
      {
        date: Date,
        total: Number,
      },
    ],
  },

  // 课程表现分析
  subjectPerformance: [
    {
      subject: String,
      averageRating: Number,
      completionRate: Number,
      studentEngagement: Number,
    },
  ],
});

// 索引
ClassAnalyticsSchema.index({ class: 1, date: -1 });
ClassAnalyticsSchema.index({ teacher: 1, date: -1 });

// 静态方法：生成学生学习分析
LearningAnalyticsSchema.statics.generateStudentAnalytics = async function (
  studentId: mongoose.Types.ObjectId | string,
  date: Date = new Date()
): Promise<ILearningAnalytics> {
  const CheckIn = mongoose.model("CheckIn");
  const Assignment = mongoose.model("Assignment");
  const Child = mongoose.model("Child");

  // 获取学生信息
  const student = await Child.findById(studentId).populate("class");
  if (!student) throw new Error("学生不存在");

  // 设置日期范围（当天）
  const startDate = new Date(date);
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(date);
  endDate.setHours(23, 59, 59, 999);

  // 获取当天的打卡记录
  const checkIns = await CheckIn.find({
    student: studentId,
    "timestamps.submittedAt": {
      $gte: startDate,
      $lte: endDate,
    },
  }).populate("assignment");

  // 计算各项指标
  const activities: IActivities = {
    checkIns: checkIns.length,
    completedAssignments: checkIns.filter((c: any) => c.status === "graded")
      .length,
    starsEarned: checkIns.reduce(
      (sum: number, c: any) => sum + (c.evaluation?.stars || 0),
      0
    ),
    studyTimeMinutes: checkIns.reduce((sum: number, c: any) => {
      // 根据媒体文件估算学习时长
      const duration =
        c.submission?.mediaFiles?.reduce(
          (d: number, f: any) => d + (f.duration || 0),
          0
        ) || 0;
      return sum + Math.max(duration / 60, 5); // 最少按5分钟计算
    }, 0),
  };

  const ratings = checkIns
    .map((c: any) => c.evaluation?.stars || 0)
    .filter((r: number) => r > 0);
  const performance: IPerformance = {
    averageRating:
      ratings.length > 0
        ? ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length
        : 0,
    excellentWorks: checkIns.filter((c: any) => c.evaluation?.isExcellent)
      .length,
    onTimeCompletionRate:
      checkIns.length > 0
        ? (checkIns.filter(
            (c: any) =>
              !c.assignment ||
              new Date(c.timestamps.submittedAt) <=
                new Date(c.assignment.schedule.dueDate)
          ).length /
            checkIns.length) *
          100
        : 0,
    activityScore: Math.min(activities.checkIns * 25, 100), // 每次打卡25分，最高100分
  };

  // 分析学习偏好
  const hourCounts: { [key: number]: number } = {};
  checkIns.forEach((c: any) => {
    const hour = new Date(c.timestamps.submittedAt).getHours();
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
  });

  const mostActiveHour = Object.keys(hourCounts).reduce(
    (a, b) => (hourCounts[parseInt(a)] > hourCounts[parseInt(b)] ? a : b),
    "0"
  );

  const preferences: IPreferences = {
    mostActiveHour: parseInt(mostActiveHour),
    favoriteSubjects: [], // 可以根据课程类型进一步分析
    deviceTypes: [],
  };

  // 保存或更新分析记录
  const analytics = await this.findOneAndUpdate(
    { student: studentId, date: startDate },
    {
      student: studentId,
      class: (student as any).class._id,
      date: startDate,
      activities,
      performance,
      preferences,
    },
    { upsert: true, new: true }
  );

  return analytics;
};

// 静态方法：生成班级分析
ClassAnalyticsSchema.statics.generateClassAnalytics = async function (
  classId: mongoose.Types.ObjectId | string,
  teacherId: mongoose.Types.ObjectId | string,
  date: Date = new Date()
): Promise<IClassAnalytics> {
  const Child = mongoose.model("Child");
  const Assignment = mongoose.model("Assignment");
  const CheckIn = mongoose.model("CheckIn");

  // 设置日期范围
  const startDate = new Date(date);
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(date);
  endDate.setHours(23, 59, 59, 999);

  // 获取班级学生
  const students = await Child.find({ class: classId });
  const studentIds = students.map((s: any) => s._id);

  // 获取班级作业和提交数据
  const assignments = await Assignment.find({ targetClass: classId });
  const checkIns = await CheckIn.find({
    student: { $in: studentIds },
    "timestamps.submittedAt": {
      $gte: startDate,
      $lte: endDate,
    },
  });

  // 计算班级指标
  const uniqueStudents = new Set(checkIns.map((c: any) => c.student.toString()));
  const classMetrics: IClassMetrics = {
    totalStudents: students.length,
    activeStudents: Array.from(uniqueStudents).length,
    totalAssignments: assignments.length,
    totalSubmissions: checkIns.length,
    classCompletionRate:
      assignments.length > 0
        ? (checkIns.filter((c: any) => c.status === "graded").length /
            assignments.length) *
          100
        : 0,
    averageClassRating:
      checkIns.length > 0
        ? checkIns.reduce(
            (sum: number, c: any) => sum + (c.evaluation?.stars || 0),
            0
          ) / checkIns.length
        : 0,
  };

  // 分析学生参与度
  const weekAgo = new Date(date);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const weeklyCheckIns = await CheckIn.find({
    student: { $in: studentIds },
    "timestamps.submittedAt": { $gte: weekAgo, $lte: endDate },
  });

  const studentActivity: { [key: string]: number } = {};
  weeklyCheckIns.forEach((c: any) => {
    const studentId = c.student.toString();
    studentActivity[studentId] = (studentActivity[studentId] || 0) + 1;
  });

  const engagement: IEngagement = {
    highEngagement: Object.values(studentActivity).filter(
      (count) => count >= 3
    ).length,
    mediumEngagement: Object.values(studentActivity).filter(
      (count) => count >= 1 && count < 3
    ).length,
    lowEngagement: students.length - Object.keys(studentActivity).length,
    studentsNeedAttention: [],
  };

  // 识别需要关注的学生
  students.forEach((student: any) => {
    const activityCount = studentActivity[student._id.toString()] || 0;
    if (activityCount === 0) {
      engagement.studentsNeedAttention.push({
        student: student._id,
        reason: "low_activity",
        severity: "high",
      });
    }
  });

  // 生成趋势数据（过去7天）
  const trends: ITrends = {
    submissionTrend: [],
    ratingTrend: [],
    starsTrend: [],
  };

  for (let i = 6; i >= 0; i--) {
    const trendDate = new Date(date);
    trendDate.setDate(trendDate.getDate() - i);
    trendDate.setHours(0, 0, 0, 0);

    const trendEndDate = new Date(trendDate);
    trendEndDate.setHours(23, 59, 59, 999);

    const dayCheckIns = await CheckIn.find({
      student: { $in: studentIds },
      "timestamps.submittedAt": {
        $gte: trendDate,
        $lte: trendEndDate,
      },
    });

    trends.submissionTrend.push({
      date: trendDate,
      count: dayCheckIns.length,
    });

    const dayRatings = dayCheckIns
      .map((c: any) => c.evaluation?.stars || 0)
      .filter((r: number) => r > 0);
    trends.ratingTrend.push({
      date: trendDate,
      average:
        dayRatings.length > 0
          ? dayRatings.reduce((a: number, b: number) => a + b, 0) /
            dayRatings.length
          : 0,
    });

    trends.starsTrend.push({
      date: trendDate,
      total: dayCheckIns.reduce(
        (sum: number, c: any) => sum + (c.evaluation?.stars || 0),
        0
      ),
    });
  }

  // 保存或更新班级分析
  const analytics = await this.findOneAndUpdate(
    { class: classId, date: startDate },
    {
      class: classId,
      teacher: teacherId,
      date: startDate,
      classMetrics,
      engagement,
      trends,
      subjectPerformance: [], // 可以根据课程进一步分析
    },
    { upsert: true, new: true }
  );

  return analytics;
};

// 导出模型
export const LearningAnalytics: ILearningAnalyticsModel =
  (mongoose.models.LearningAnalytics as ILearningAnalyticsModel) ??
  mongoose.model<ILearningAnalytics, ILearningAnalyticsModel>(
    "LearningAnalytics",
    LearningAnalyticsSchema
  );

export const ClassAnalytics: IClassAnalyticsModel =
  (mongoose.models.ClassAnalytics as IClassAnalyticsModel) ??
  mongoose.model<IClassAnalytics, IClassAnalyticsModel>(
    "ClassAnalytics",
    ClassAnalyticsSchema
  );
