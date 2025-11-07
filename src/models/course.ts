import mongoose, { Document, Schema, Model } from "mongoose";

// 课程等级类型
export type CourseLevel = "Beginner" | "Elementary" | "Intermediate";

// 课程状态类型
export type CourseStatus = "pending" | "current" | "completed";

// 目标年级类型
export type TargetGrade = "小班 Ivy K1" | "中班 Ivy K2" | "大班 Ivy K3";

// 打卡任务类型
export type CheckInType =
  | "video_recitation"
  | "audio_reading"
  | "photo_homework"
  | "parent_interaction";

// 游戏类型
export type GameType = "matching" | "spelling" | "listening" | "memory";

// 词汇接口
export interface IVocabularyWord {
  word: string;
  chinese: string;
  pronunciation: string;
  audio: string;
  image: string;
  category: string;
}

// 词汇学习接口
export interface IVocabulary {
  words: IVocabularyWord[];
  exercises: string[];
}

// 拼读学习接口
export interface IPhonics {
  letters: string[];
  sounds: string[];
  rules: string;
  audio: string;
  exercises: string[];
}

// 对话接口
export interface IDialogue {
  question: string;
  answer: string;
}

// 句型表达接口
export interface ISentences {
  patterns: string[];
  examples: string[];
  dialogues: IDialogue[];
  audio: string;
}

// 儿歌学习接口
export interface ISongs {
  title: string;
  lyrics: string;
  audio: string;
  video: string;
  actions: string[];
}

// 视频接口
export interface IVideo {
  title: string;
  url: string;
  duration: number; // 秒数
  thumbnail: string;
}

// PPT接口
export interface IPresentation {
  title: string;
  url: string;
  pageCount: number;
  thumbnail: string;
}

// 音频接口
export interface IAudio {
  title: string;
  url: string;
  duration: number; // 秒数
}

// 课程内容接口
export interface ICourseContent {
  vocabulary: IVocabulary;
  phonics: IPhonics;
  sentences: ISentences;
  songs: ISongs;
  videos: IVideo[];
  presentations: IPresentation[];
  audios: IAudio[];
  objectives: string[];
}

// 词汇游戏接口
export interface IVocabularyGame {
  type: GameType;
  difficulty: number;
  timeLimit: number;
  pointsPerCorrect: number;
  questions: any[];
  isActive: boolean;
}

// 课程元数据接口
export interface ICourseMetadata {
  semester: number;
  week: number;
  theme: string;
  unit: string;
  code: string;
  festival: string;
  difficulty: number;
  duration: number;
  tags: string[];
}

// 打卡任务要求接口
export interface ICheckInRequirements {
  description: string;
  type: CheckInType;
  minDuration: number;
  criteria: string[];
}

// 课程序号接口
export interface ICourseSequence {
  unit: number;
  lesson: number;
  order: number; // 在单元中的顺序
}

// 课程统计信息接口
export interface ICourseStats {
  totalAssignments: number;
  totalCompletions: number;
  averageRating: number;
}

// 课程文档接口
export interface ICourse extends Document {
  title: string;
  description: string;
  level: CourseLevel;
  targetGrades: TargetGrade[];
  content: ICourseContent;
  vocabularyGames: IVocabularyGame[];
  metadata: ICourseMetadata;
  checkInRequirements: ICheckInRequirements;
  sequence: ICourseSequence;
  difficulty: number;
  estimatedDuration: number;
  tags: string[];
  prerequisites: mongoose.Types.ObjectId[];
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId;
  status: CourseStatus;
  progress: number;
  completedAt: Date | null;
  stars: number;
  stats: ICourseStats;
  createdAt: Date;
  updatedAt: Date;

  // 实例方法
  getCompletionRate(): number;
  updateStats(): Promise<ICourse>;
}

// 课程Model接口
export interface ICourseModel extends Model<ICourse> {
  findByLevelAndGrade(level: CourseLevel, grade: TargetGrade): Promise<ICourse[]>;
}

// 课程Schema
const CourseSchema: Schema = new Schema({
  // 课程基本信息
  title: {
    type: String,
    required: true,
    trim: true,
  },

  // 课程描述
  description: {
    type: String,
    required: true,
    maxlength: 1000,
  },

  // 课程等级
  level: {
    type: String,
    required: true,
    enum: ["Beginner", "Elementary", "Intermediate"],
  },

  // 适合年级
  targetGrades: [
    {
      type: String,
      enum: ["小班 Ivy K1", "中班 Ivy K2", "大班 Ivy K3"],
    },
  ],

  // 课程内容
  content: {
    // 词汇学习
    vocabulary: {
      words: [
        {
          word: String,
          chinese: String,
          pronunciation: String,
          audio: String,
          image: String,
          category: String,
        },
      ],
      exercises: [String],
    },

    // 拼读学习
    phonics: {
      letters: [String],
      sounds: [String],
      rules: String,
      audio: String,
      exercises: [String],
    },

    // 句型表达
    sentences: {
      patterns: [String],
      examples: [String],
      dialogues: [
        {
          question: String,
          answer: String,
        },
      ],
      audio: String,
    },

    // 儿歌学习
    songs: {
      title: String,
      lyrics: String,
      audio: String,
      video: String,
      actions: [String],
    },

    // 教学视频
    videos: [
      {
        title: String,
        url: String,
        duration: Number, // 秒数
        thumbnail: String,
      },
    ],

    // PPT 文件
    presentations: [
      {
        title: String,
        url: String,
        pageCount: Number,
        thumbnail: String,
      },
    ],

    // 音频文件
    audios: [
      {
        title: String,
        url: String,
        duration: Number, // 秒数
      },
    ],

    // 学习目标
    objectives: [String],
  },

  // 词汇练习游戏
  vocabularyGames: [
    {
      type: {
        type: String,
        enum: ["matching", "spelling", "listening", "memory"],
      },
      difficulty: Number,
      timeLimit: Number,
      pointsPerCorrect: Number,
      questions: [Object],
      isActive: Boolean,
    },
  ],

  // 课程元数据
  metadata: {
    semester: Number,
    week: Number,
    theme: String,
    unit: String,
    code: String,
    festival: String,
    difficulty: Number,
    duration: Number,
    tags: [String],
  },

  // 打卡任务要求
  checkInRequirements: {
    // 任务描述
    description: {
      type: String,
      required: true,
    },

    // 任务类型
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

    // 最短时长（对于视频/音频任务）
    minDuration: {
      type: Number,
      default: 10, // 秒
    },

    // 评分标准
    criteria: [String],
  },

  // 课程序号
  sequence: {
    unit: Number,
    lesson: Number,
    order: Number, // 在单元中的顺序
  },

  // 难度评级
  difficulty: {
    type: Number,
    min: 1,
    max: 5,
    default: 1,
  },

  // 预计学习时长（分钟）
  estimatedDuration: {
    type: Number,
    default: 30,
  },

  // 课程标签
  tags: [String],

  // 先修课程
  prerequisites: [
    {
      type: Schema.Types.ObjectId,
      ref: "Course",
    },
  ],

  // 课程状态
  isActive: {
    type: Boolean,
    default: true,
  },

  // 创建者
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },

  // 学习状态
  status: {
    type: String,
    enum: ["pending", "current", "completed"],
    default: "pending",
  },

  // 学习进度
  progress: {
    type: Number,
    min: 0,
    max: 100,
    default: 0,
  },

  // 完成时间
  completedAt: {
    type: Date,
    default: null,
  },

  // 星星数量
  stars: {
    type: Number,
    default: 0,
  },

  // 统计信息
  stats: {
    totalAssignments: {
      type: Number,
      default: 0,
    },
    totalCompletions: {
      type: Number,
      default: 0,
    },
    averageRating: {
      type: Number,
      default: 0,
    },
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
CourseSchema.pre("findOneAndUpdate", function () {
  this.set({ updatedAt: new Date() });
});

// 索引
CourseSchema.index({ level: 1, "sequence.unit": 1, "sequence.lesson": 1 });
CourseSchema.index({ targetGrades: 1 });
CourseSchema.index({ tags: 1 });

// 静态方法：根据等级和年级查找课程
CourseSchema.statics.findByLevelAndGrade = function (
  level: CourseLevel,
  grade: TargetGrade
) {
  return this.find({
    level: level,
    targetGrades: grade,
    isActive: true,
  }).sort({ "sequence.unit": 1, "sequence.order": 1 });
};

// 实例方法：获取完成率
CourseSchema.methods.getCompletionRate = function (): number {
  if (this.stats.totalAssignments === 0) return 0;
  return Math.round(
    (this.stats.totalCompletions / this.stats.totalAssignments) * 100
  );
};

// 实例方法：更新统计信息
CourseSchema.methods.updateStats = function (): Promise<ICourse> {
  // 这里可以添加计算逻辑
  return this.save();
};

// 导出模型
const Course: ICourseModel =
  (mongoose.models.Course as ICourseModel) ??
  mongoose.model<ICourse, ICourseModel>("Course", CourseSchema);

export default Course;
