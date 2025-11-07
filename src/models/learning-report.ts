import mongoose, { Document, Schema, Model } from "mongoose";

// 报告类型
export type ReportType =
  | "daily"
  | "weekly"
  | "monthly"
  | "semester"
  | "annual"
  | "custom";

// 报告对象类型
export type ReportTargetType = "student" | "class" | "parent";

// 报告目标模型
export type ReportTargetModel = "Child" | "Class" | "Parent";

// 报告状态
export type ReportStatus =
  | "draft"
  | "generated"
  | "reviewed"
  | "published"
  | "archived";

// 亮点类型
export type HighlightType = "achievement" | "improvement" | "milestone";

// 优先级
export type Priority = "low" | "medium" | "high";

// 权限类型
export type PermissionType = "view" | "comment" | "edit";

// 报告时间范围接口
export interface IReportPeriod {
  startDate: Date;
  endDate: Date;
  description?: string; // "2024年1月第1周"
}

// 关键指标接口
export interface IKeyMetrics {
  totalLessons: number;
  completedLessons: number;
  totalStars: number;
  averageRating: number;
  completionRate: number;
  activityScore: number;
}

// 亮点成就接口
export interface IHighlight {
  type: HighlightType;
  title: string;
  description: string;
  icon: string;
  value: any;
}

// 改进建议接口
export interface IRecommendation {
  category: string; // 'learning_habit', 'subject_focus', 'time_management'
  priority: Priority;
  suggestion: string;
  actionPlan: string;
}

// 报告摘要接口
export interface ISummary {
  keyMetrics: IKeyMetrics;
  highlights: IHighlight[];
  recommendations: IRecommendation[];
}

// 打卡频率接口
export interface ICheckInFrequency {
  date: Date;
  count: number;
}

// 学习时间分布接口
export interface IStudyTimeDistribution {
  timeSlot: string; // "上午", "下午", "晚上"
  minutes: number;
  percentage: number;
}

// 科目表现接口
export interface ISubjectPerformance {
  subject: string;
  completedLessons: number;
  averageRating: number;
  totalStars: number;
  improvement: number; // 相比上期的改进百分比
}

// 学习活动分析接口
export interface IActivityAnalysis {
  checkInFrequency: ICheckInFrequency[];
  studyTimeDistribution: IStudyTimeDistribution[];
  subjectPerformance: ISubjectPerformance[];
}

// 表现趋势接口
export interface IPerformanceTrends {
  performanceTrend: string; // 'improving', 'stable', 'declining'
  consistencyScore: number; // 0-100
  engagementLevel: string; // 'high', 'medium', 'low'
  learningPace: string; // 'fast', 'normal', 'slow'
}

// 比较分析接口
export interface IComparison {
  classAverage: number;
  ranking: number;
  totalClassmates: number;
  percentile: number;
}

// 详细分析接口
export interface IDetailedAnalysis {
  activities: IActivityAnalysis;
  trends: IPerformanceTrends;
  comparison: IComparison;
}

// 证据接口
export interface IEvidence {
  type: string; // 'checkin', 'evaluation', 'feedback'
  id: mongoose.Types.ObjectId;
  description: string;
}

// 成长记录接口
export interface IGrowthRecord {
  category: string; // 'skill', 'knowledge', 'behavior'
  milestone: string;
  achievedDate: Date;
  description: string;
  evidence: IEvidence[];
}

// 家长反馈接口
export interface IParentFeedback {
  homeObservations?: string;
  questions: string[];
  concerns: string[];
  submittedAt?: Date;
  submittedBy?: mongoose.Types.ObjectId;
}

// 家长会议接口
export interface IParentMeeting {
  suggested: boolean;
  reason?: string;
  urgency: Priority;
}

// 教师评语接口
export interface ITeacherComments {
  overallAssessment?: string;
  strengths: string[];
  areasForImprovement: string[];
  nextStepGoals: string[];
  parentMeeting: IParentMeeting;
  commentedBy?: mongoose.Types.ObjectId;
  commentedAt?: Date;
}

// 附件资料接口
export interface IAttachment {
  type: string; // 'excellent_work', 'progress_video', 'skill_demo'
  title: string;
  url: string;
  thumbnail?: string;
  description?: string;
  uploadedAt: Date;
}

// 生成信息接口
export interface IGeneration {
  generatedBy?: mongoose.Types.ObjectId;
  generatedAt?: Date;
  lastModified?: Date;
  version: number;
}

// 分享用户接口
export interface ISharedUser {
  user: mongoose.Types.ObjectId;
  permission: PermissionType;
  sharedAt: Date;
}

// 分享和权限接口
export interface ISharing {
  isPublic: boolean;
  sharedWith: ISharedUser[];
  downloadCount: number;
}

// 学习报告文档接口
export interface ILearningReport extends Document {
  type: ReportType;
  targetType: ReportTargetType;
  targetId: mongoose.Types.ObjectId;
  targetModel: ReportTargetModel;
  title: string;
  period: IReportPeriod;
  summary: ISummary;
  detailedAnalysis: IDetailedAnalysis;
  growthRecords: IGrowthRecord[];
  parentFeedback: IParentFeedback;
  teacherComments: ITeacherComments;
  attachments: IAttachment[];
  status: ReportStatus;
  generation: IGeneration;
  sharing: ISharing;

  // 实例方法
  exportToPDF(): any;
  shareWithParents(studentId: mongoose.Types.ObjectId | string): Promise<ILearningReport>;
}

// 学习报告Model接口
export interface ILearningReportModel extends Model<ILearningReport> {
  generateStudentReport(
    studentId: mongoose.Types.ObjectId | string,
    type?: ReportType,
    customPeriod?: IReportPeriod | null
  ): Promise<ILearningReport>;
  generateClassReport(
    classId: mongoose.Types.ObjectId | string,
    teacherId: mongoose.Types.ObjectId | string,
    type?: ReportType
  ): Promise<ILearningReport>;
}

// 学习报告Schema
const LearningReportSchema: Schema = new Schema({
  // 报告类型
  type: {
    type: String,
    enum: ["daily", "weekly", "monthly", "semester", "annual", "custom"],
    required: true,
  },

  // 报告对象类型
  targetType: {
    type: String,
    enum: ["student", "class", "parent"],
    required: true,
  },

  // 目标对象ID
  targetId: {
    type: Schema.Types.ObjectId,
    required: true,
    refPath: "targetModel",
  },

  // 目标模型
  targetModel: {
    type: String,
    required: true,
    enum: ["Child", "Class", "Parent"],
  },

  // 报告标题
  title: {
    type: String,
    required: true,
  },

  // 报告时间范围
  period: {
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    description: String, // "2024年1月第1周"
  },

  // 报告摘要
  summary: {
    // 关键数据
    keyMetrics: {
      totalLessons: Number,
      completedLessons: Number,
      totalStars: Number,
      averageRating: Number,
      completionRate: Number,
      activityScore: Number,
    },

    // 亮点成就
    highlights: [
      {
        type: String, // 'achievement', 'improvement', 'milestone'
        title: String,
        description: String,
        icon: String,
        value: Schema.Types.Mixed,
      },
    ],

    // 改进建议
    recommendations: [
      {
        category: String, // 'learning_habit', 'subject_focus', 'time_management'
        priority: {
          type: String,
          enum: ["low", "medium", "high"],
          default: "medium",
        },
        suggestion: String,
        actionPlan: String,
      },
    ],
  },

  // 详细分析
  detailedAnalysis: {
    // 学习活动分析
    activities: {
      checkInFrequency: [
        {
          date: Date,
          count: Number,
        },
      ],
      studyTimeDistribution: [
        {
          timeSlot: String, // "上午", "下午", "晚上"
          minutes: Number,
          percentage: Number,
        },
      ],
      subjectPerformance: [
        {
          subject: String,
          completedLessons: Number,
          averageRating: Number,
          totalStars: Number,
          improvement: Number, // 相比上期的改进百分比
        },
      ],
    },

    // 表现趋势
    trends: {
      performanceTrend: String, // 'improving', 'stable', 'declining'
      consistencyScore: Number, // 0-100
      engagementLevel: String, // 'high', 'medium', 'low'
      learningPace: String, // 'fast', 'normal', 'slow'
    },

    // 比较分析
    comparison: {
      classAverage: Number,
      ranking: Number,
      totalClassmates: Number,
      percentile: Number,
    },
  },

  // 成长记录
  growthRecords: [
    {
      category: String, // 'skill', 'knowledge', 'behavior'
      milestone: String,
      achievedDate: Date,
      description: String,
      evidence: [
        {
          type: String, // 'checkin', 'evaluation', 'feedback'
          id: Schema.Types.ObjectId,
          description: String,
        },
      ],
    },
  ],

  // 家长反馈区
  parentFeedback: {
    homeObservations: String,
    questions: [String],
    concerns: [String],
    submittedAt: Date,
    submittedBy: {
      type: Schema.Types.ObjectId,
      ref: "Parent", // 修改为引用 Parent 模型
    },
  },

  // 教师评语
  teacherComments: {
    overallAssessment: String,
    strengths: [String],
    areasForImprovement: [String],
    nextStepGoals: [String],
    parentMeeting: {
      suggested: Boolean,
      reason: String,
      urgency: {
        type: String,
        enum: ["low", "medium", "high"],
        default: "low",
      },
    },
    commentedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    commentedAt: Date,
  },

  // 附件资料
  attachments: [
    {
      type: String, // 'excellent_work', 'progress_video', 'skill_demo'
      title: String,
      url: String,
      thumbnail: String,
      description: String,
      uploadedAt: Date,
    },
  ],

  // 报告状态
  status: {
    type: String,
    enum: ["draft", "generated", "reviewed", "published", "archived"],
    default: "draft",
  },

  // 生成信息
  generation: {
    generatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    generatedAt: Date,
    lastModified: Date,
    version: {
      type: Number,
      default: 1,
    },
  },

  // 分享和权限
  sharing: {
    isPublic: {
      type: Boolean,
      default: false,
    },
    sharedWith: [
      {
        user: {
          type: Schema.Types.ObjectId,
          ref: "User",
        },
        permission: {
          type: String,
          enum: ["view", "comment", "edit"],
          default: "view",
        },
        sharedAt: Date,
      },
    ],
    downloadCount: {
      type: Number,
      default: 0,
    },
  },
});

// 索引
LearningReportSchema.index({ targetId: 1, type: 1, "period.startDate": -1 });
LearningReportSchema.index({ "generation.generatedAt": -1 });
LearningReportSchema.index({ status: 1 });

// 静态方法：生成学生学习报告
LearningReportSchema.statics.generateStudentReport = async function (
  studentId: mongoose.Types.ObjectId | string,
  type: ReportType = "weekly",
  customPeriod: IReportPeriod | null = null
): Promise<ILearningReport> {
  const Child = mongoose.model("Child");
  const CheckIn = mongoose.model("CheckIn");
  const Assignment = mongoose.model("Assignment");
  const { StarLevel } = require("./star-achievement");

  // 获取学生信息
  const student = await Child.findById(studentId).populate("class parents.user");
  if (!student) throw new Error("学生不存在");

  // 确定报告期间
  let period: IReportPeriod;
  const now = new Date();

  if (customPeriod) {
    period = customPeriod;
  } else {
    switch (type) {
      case "daily":
        period = {
          startDate: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
          endDate: new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
            23,
            59,
            59
          ),
          description: `${now.getFullYear()}年${
            now.getMonth() + 1
          }月${now.getDate()}日`,
        };
        break;
      case "weekly":
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        weekStart.setHours(0, 0, 0, 0);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);
        period = {
          startDate: weekStart,
          endDate: weekEnd,
          description: `${weekStart.getFullYear()}年${
            weekStart.getMonth() + 1
          }月第${Math.ceil(weekStart.getDate() / 7)}周`,
        };
        break;
      case "monthly":
        period = {
          startDate: new Date(now.getFullYear(), now.getMonth(), 1),
          endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59),
          description: `${now.getFullYear()}年${now.getMonth() + 1}月`,
        };
        break;
      default:
        period = {
          startDate: new Date(now.getFullYear(), now.getMonth(), 1),
          endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59),
          description: `${now.getFullYear()}年${now.getMonth() + 1}月`,
        };
    }
  }

  // 获取期间内的学习数据
  const checkIns = await CheckIn.find({
    student: studentId,
    "timestamps.submittedAt": {
      $gte: period.startDate,
      $lte: period.endDate,
    },
  }).populate("assignment");

  const assignments = await Assignment.find({
    targetClass: (student as any).class._id,
    "schedule.publishDate": {
      $gte: period.startDate,
      $lte: period.endDate,
    },
  });

  // 获取星星等级信息
  const starLevel = await StarLevel.findOne({ student: studentId });

  // 计算关键指标
  const totalLessons = assignments.length;
  const completedLessons = checkIns.filter(
    (c: any) => c.status === "graded"
  ).length;
  const totalStars = checkIns.reduce(
    (sum: number, c: any) => sum + (c.evaluation?.stars || 0),
    0
  );
  const ratings = checkIns
    .map((c: any) => c.evaluation?.stars || 0)
    .filter((r: number) => r > 0);
  const averageRating =
    ratings.length > 0
      ? ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length
      : 0;
  const completionRate =
    totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;

  // 生成亮点和建议
  const highlights: IHighlight[] = [];
  const recommendations: IRecommendation[] = [];

  if (totalStars > 0) {
    highlights.push({
      type: "achievement",
      title: "星星收获",
      description: `本期获得了${totalStars}颗星星！`,
      icon: "⭐",
      value: totalStars,
    });
  }

  if (completionRate >= 80) {
    highlights.push({
      type: "improvement",
      title: "完成率优秀",
      description: `作业完成率达到${Math.round(completionRate)}%`,
      icon: "🎯",
      value: completionRate,
    });
  } else if (completionRate < 50) {
    recommendations.push({
      category: "learning_habit",
      priority: "high",
      suggestion: "建议建立固定的学习时间，提高作业完成率",
      actionPlan: "每天安排固定时间进行英语学习，家长适当提醒和鼓励",
    });
  }

  // 创建报告
  const report = new this({
    type,
    targetType: "student",
    targetId: studentId,
    targetModel: "Child",
    title: `${(student as any).name}的${period.description}学习报告`,
    period,
    summary: {
      keyMetrics: {
        totalLessons,
        completedLessons,
        totalStars,
        averageRating: Math.round(averageRating * 10) / 10,
        completionRate: Math.round(completionRate),
        activityScore: Math.min(checkIns.length * 20, 100),
      },
      highlights,
      recommendations,
    },
    detailedAnalysis: {
      activities: {
        checkInFrequency: [], // 可以进一步计算
        studyTimeDistribution: [],
        subjectPerformance: [],
      },
      trends: {
        performanceTrend:
          completionRate >= 80
            ? "improving"
            : completionRate >= 60
            ? "stable"
            : "declining",
        consistencyScore: Math.min(checkIns.length * 15, 100),
        engagementLevel:
          checkIns.length >= 5 ? "high" : checkIns.length >= 2 ? "medium" : "low",
        learningPace: "normal",
      },
      comparison: {
        classAverage: 0, // 需要计算班级平均
        ranking: 0,
        totalClassmates: 0,
        percentile: 0,
      },
    },
    growthRecords: [],
    parentFeedback: {
      questions: [],
      concerns: [],
    },
    teacherComments: {
      strengths: [],
      areasForImprovement: [],
      nextStepGoals: [],
      parentMeeting: {
        suggested: false,
        urgency: "low",
      },
    },
    attachments: [],
    status: "generated",
    generation: {
      generatedAt: new Date(),
      lastModified: new Date(),
      version: 1,
    },
    sharing: {
      isPublic: false,
      sharedWith: [],
      downloadCount: 0,
    },
  });

  return await report.save();
};

// 静态方法：生成班级报告
LearningReportSchema.statics.generateClassReport = async function (
  classId: mongoose.Types.ObjectId | string,
  teacherId: mongoose.Types.ObjectId | string,
  type: ReportType = "weekly"
): Promise<ILearningReport> {
  const Class = mongoose.model("Class");
  const Child = mongoose.model("Child");
  const CheckIn = mongoose.model("CheckIn");
  const Assignment = mongoose.model("Assignment");

  // 获取班级信息
  const classInfo = await Class.findById(classId).populate("students");
  if (!classInfo) throw new Error("班级不存在");

  // 确定报告期间
  const now = new Date();
  let period: IReportPeriod;

  switch (type) {
    case "weekly":
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);
      period = {
        startDate: weekStart,
        endDate: weekEnd,
        description: `${(classInfo as any).name} ${weekStart.getFullYear()}年${
          weekStart.getMonth() + 1
        }月第${Math.ceil(weekStart.getDate() / 7)}周`,
      };
      break;
    case "monthly":
      period = {
        startDate: new Date(now.getFullYear(), now.getMonth(), 1),
        endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59),
        description: `${(classInfo as any).name} ${now.getFullYear()}年${
          now.getMonth() + 1
        }月`,
      };
      break;
    default:
      period = {
        startDate: new Date(now.getFullYear(), now.getMonth(), 1),
        endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59),
        description: `${(classInfo as any).name} ${now.getFullYear()}年${
          now.getMonth() + 1
        }月`,
      };
  }

  // 获取班级学生
  const students = await Child.find({ class: classId });
  const studentIds = students.map((s: any) => s._id);

  // 获取期间内的数据
  const checkIns = await CheckIn.find({
    student: { $in: studentIds },
    "timestamps.submittedAt": {
      $gte: period.startDate,
      $lte: period.endDate,
    },
  }).populate("student assignment");

  const assignments = await Assignment.find({
    targetClass: classId,
    teacher: teacherId,
    "schedule.publishDate": {
      $gte: period.startDate,
      $lte: period.endDate,
    },
  });

  // 计算班级指标
  const totalStudents = students.length;
  const uniqueActiveStudents = new Set(checkIns.map((c: any) => c.student._id.toString()));
  const activeStudents = Array.from(uniqueActiveStudents).length;
  const totalAssignments = assignments.length;
  const totalSubmissions = checkIns.length;
  const completionRate =
    totalAssignments > 0
      ? (totalSubmissions / (totalAssignments * totalStudents)) * 100
      : 0;
  const averageRating =
    checkIns.length > 0
      ? checkIns.reduce(
          (sum: number, c: any) => sum + (c.evaluation?.stars || 0),
          0
        ) / checkIns.length
      : 0;

  // 生成班级报告
  const report = new this({
    type,
    targetType: "class",
    targetId: classId,
    targetModel: "Class",
    title: `${period.description}班级学习报告`,
    period,
    summary: {
      keyMetrics: {
        totalLessons: totalAssignments,
        completedLessons: checkIns.filter((c: any) => c.status === "graded")
          .length,
        totalStars: checkIns.reduce(
          (sum: number, c: any) => sum + (c.evaluation?.stars || 0),
          0
        ),
        averageRating: Math.round(averageRating * 10) / 10,
        completionRate: Math.round(completionRate),
        activityScore: Math.round((activeStudents / totalStudents) * 100),
      },
      highlights: [],
      recommendations: [],
    },
    detailedAnalysis: {
      activities: {
        checkInFrequency: [],
        studyTimeDistribution: [],
        subjectPerformance: [],
      },
      trends: {
        performanceTrend: "stable",
        consistencyScore: 0,
        engagementLevel: "medium",
        learningPace: "normal",
      },
      comparison: {
        classAverage: 0,
        ranking: 0,
        totalClassmates: 0,
        percentile: 0,
      },
    },
    growthRecords: [],
    parentFeedback: {
      questions: [],
      concerns: [],
    },
    teacherComments: {
      strengths: [],
      areasForImprovement: [],
      nextStepGoals: [],
      parentMeeting: {
        suggested: false,
        urgency: "low",
      },
    },
    attachments: [],
    status: "generated",
    generation: {
      generatedBy: teacherId,
      generatedAt: new Date(),
      lastModified: new Date(),
      version: 1,
    },
    sharing: {
      isPublic: false,
      sharedWith: [],
      downloadCount: 0,
    },
  });

  return await report.save();
};

// 实例方法：导出为PDF（占位符，实际需要PDF生成库）
LearningReportSchema.methods.exportToPDF = function (this: ILearningReport) {
  // 这里可以集成PDF生成库，如puppeteer或jsPDF
  return {
    success: true,
    message: "PDF生成功能待实现",
    downloadUrl: `/api/reports/${this._id}/pdf`,
  };
};

// 实例方法：分享给家长
LearningReportSchema.methods.shareWithParents = async function (
  this: ILearningReport,
  studentId: mongoose.Types.ObjectId | string
): Promise<ILearningReport> {
  const Child = mongoose.model("Child");
  const Parent = mongoose.model("Parent");
  const child = await Child.findById(studentId).populate("parents.user");

  // parents.user 现在引用 Parent 模型
  const parentUsers = (child as any).parents.map((p: any) => p.user._id);

  parentUsers.forEach((parentId: mongoose.Types.ObjectId) => {
    this.sharing.sharedWith.push({
      user: parentId,
      permission: "view",
      sharedAt: new Date(),
    });
  });

  return await this.save();
};

// 导出模型
const LearningReport: ILearningReportModel =
  (mongoose.models.LearningReport as ILearningReportModel) ??
  mongoose.model<ILearningReport, ILearningReportModel>(
    "LearningReport",
    LearningReportSchema
  );

export default LearningReport;
