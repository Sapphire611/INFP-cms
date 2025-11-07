import mongoose, { Document, Schema, Model } from "mongoose";

// 星星类型
export type StarType =
  | "homework_completion"
  | "excellent_performance"
  | "consistency_bonus"
  | "progress_milestone"
  | "special_achievement"
  | "participation_reward";

// 成就等级
export type AchievementLevel = "bronze" | "silver" | "gold" | "diamond";

// 徽章稀有度
export type BadgeRarity = "common" | "rare" | "epic" | "legendary";

// 额外奖励信息接口
export interface IBonus {
  consecutiveDays?: number; // 连续天数
  milestoneNumber?: number; // 里程碑编号
  specialReason?: string; // 特殊原因
}

// 星星成就文档接口
export interface IStarAchievement extends Document {
  student: mongoose.Types.ObjectId;
  checkIn?: mongoose.Types.ObjectId;
  type: StarType;
  starsEarned: number;
  title: string;
  description: string;
  level: AchievementLevel;
  earnedAt: Date;
  relatedCourse?: mongoose.Types.ObjectId;
  relatedAssignment?: mongoose.Types.ObjectId;
  bonus?: IBonus;
}

// 徽章接口
export interface IBadge {
  name: string;
  description: string;
  icon: string;
  unlockedAt: Date;
  rarity: BadgeRarity;
}

// 连续学习记录接口
export interface IStreaks {
  current: number;
  longest: number;
  lastCheckInDate?: Date;
}

// 星星等级文档接口
export interface IStarLevel extends Document {
  student: mongoose.Types.ObjectId;
  totalStars: number;
  currentLevel: string;
  currentLevelStars: number;
  nextLevelRequiredStars: number;
  levelProgress: number;
  badges: IBadge[];
  streaks: IStreaks;
  updatedAt: Date;

  // 实例方法
  updateLevel(): Promise<IStarLevel>;
  addStars(amount: number, type?: StarType): Promise<IStarLevel>;
  updateStreak(): Promise<IStarLevel>;
  unlockBadge(badgeData: Partial<IBadge>): Promise<IStarLevel>;
}

// 等级要求配置类型
export interface ILevelConfig {
  min: number;
  max: number;
  next: string | null;
}

export interface ILevelRequirements {
  [key: string]: ILevelConfig;
}

// 星星等级Model接口
export interface IStarLevelModel extends Model<IStarLevel> {
  getLevelRequirements(): ILevelRequirements;
  checkAchievements(studentId: mongoose.Types.ObjectId | string): Promise<any>;
}

// 星星成就Schema
const StarAchievementSchema: Schema = new Schema({
  // 学生
  student: {
    type: Schema.Types.ObjectId,
    ref: "Child",
    required: true,
  },

  // 相关打卡记录
  checkIn: {
    type: Schema.Types.ObjectId,
    ref: "CheckIn",
  },

  // 星星类型
  type: {
    type: String,
    enum: [
      "homework_completion",
      "excellent_performance",
      "consistency_bonus",
      "progress_milestone",
      "special_achievement",
      "participation_reward",
    ],
    required: true,
  },

  // 获得星星数
  starsEarned: {
    type: Number,
    required: true,
    min: 1,
    max: 10,
  },

  // 成就标题
  title: {
    type: String,
    required: true,
  },

  // 成就描述
  description: {
    type: String,
    required: true,
  },

  // 成就等级
  level: {
    type: String,
    enum: ["bronze", "silver", "gold", "diamond"],
    default: "bronze",
  },

  // 获得时间
  earnedAt: {
    type: Date,
    default: Date.now,
  },

  // 相关课程
  relatedCourse: {
    type: Schema.Types.ObjectId,
    ref: "Course",
  },

  // 相关作业
  relatedAssignment: {
    type: Schema.Types.ObjectId,
    ref: "Assignment",
  },

  // 额外奖励信息
  bonus: {
    consecutiveDays: Number, // 连续天数
    milestoneNumber: Number, // 里程碑编号
    specialReason: String, // 特殊原因
  },
});

// 索引
StarAchievementSchema.index({ student: 1, earnedAt: -1 });
StarAchievementSchema.index({ type: 1, level: 1 });

// 星星等级Schema
const StarLevelSchema: Schema = new Schema({
  // 学生
  student: {
    type: Schema.Types.ObjectId,
    ref: "Child",
    required: true,
    unique: true,
  },

  // 总星星数
  totalStars: {
    type: Number,
    default: 0,
    min: 0,
  },

  // 当前等级
  currentLevel: {
    type: String,
    default: "Beginner",
  },

  // 当前等级的星星数
  currentLevelStars: {
    type: Number,
    default: 0,
  },

  // 下一等级所需星星数
  nextLevelRequiredStars: {
    type: Number,
    default: 10,
  },

  // 等级进度百分比
  levelProgress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },

  // 成就徽章
  badges: [
    {
      name: String,
      description: String,
      icon: String,
      unlockedAt: Date,
      rarity: {
        type: String,
        enum: ["common", "rare", "epic", "legendary"],
        default: "common",
      },
    },
  ],

  // 连续学习记录
  streaks: {
    current: {
      type: Number,
      default: 0,
    },
    longest: {
      type: Number,
      default: 0,
    },
    lastCheckInDate: Date,
  },

  // 更新时间
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// 更新时间戳
StarLevelSchema.pre("findOneAndUpdate", function () {
  this.set({ updatedAt: new Date() });
});

// 等级配置
const LEVEL_REQUIREMENTS: ILevelRequirements = {
  Beginner: { min: 0, max: 9, next: "Explorer" },
  Explorer: { min: 10, max: 24, next: "Adventurer" },
  Adventurer: { min: 25, max: 49, next: "Champion" },
  Champion: { min: 50, max: 99, next: "Master" },
  Master: { min: 100, max: 199, next: "Expert" },
  Expert: { min: 200, max: 399, next: "Legend" },
  Legend: { min: 400, max: 799, next: "Grandmaster" },
  Grandmaster: { min: 800, max: 9999, next: null },
};

// 静态方法：获取等级要求
StarLevelSchema.statics.getLevelRequirements = function (): ILevelRequirements {
  return LEVEL_REQUIREMENTS;
};

// 实例方法：更新等级
StarLevelSchema.methods.updateLevel = function (
  this: IStarLevel
): Promise<IStarLevel> {
  const requirements = LEVEL_REQUIREMENTS;
  let newLevel = "Beginner";

  for (const [level, config] of Object.entries(requirements)) {
    if (this.totalStars >= config.min && this.totalStars <= config.max) {
      newLevel = level;
      this.currentLevel = level;
      this.currentLevelStars = this.totalStars - config.min;
      this.nextLevelRequiredStars = config.next
        ? requirements[config.next].min - this.totalStars
        : 0;
      this.levelProgress = config.next
        ? Math.round(
            (this.currentLevelStars / (config.max - config.min + 1)) * 100
          )
        : 100;
      break;
    }
  }

  return this.save();
};

// 实例方法：添加星星
StarLevelSchema.methods.addStars = function (
  this: IStarLevel,
  amount: number,
  type: StarType = "homework_completion"
): Promise<IStarLevel> {
  this.totalStars += amount;
  return this.updateLevel();
};

// 实例方法：更新连续学习记录
StarLevelSchema.methods.updateStreak = function (
  this: IStarLevel
): Promise<IStarLevel> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const lastCheckIn = this.streaks.lastCheckInDate
    ? new Date(this.streaks.lastCheckInDate)
    : null;

  if (lastCheckIn) {
    lastCheckIn.setHours(0, 0, 0, 0);
    const daysDiff = Math.floor(
      (today.getTime() - lastCheckIn.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysDiff === 1) {
      // 连续学习
      this.streaks.current += 1;
      if (this.streaks.current > this.streaks.longest) {
        this.streaks.longest = this.streaks.current;
      }
    } else if (daysDiff > 1) {
      // 断了连续记录
      this.streaks.current = 1;
    }
    // daysDiff === 0 表示今天已经打卡过了，不做处理
  } else {
    // 第一次打卡
    this.streaks.current = 1;
    this.streaks.longest = 1;
  }

  this.streaks.lastCheckInDate = new Date();
  return this.save();
};

// 实例方法：解锁徽章
StarLevelSchema.methods.unlockBadge = function (
  this: IStarLevel,
  badgeData: Partial<IBadge>
): Promise<IStarLevel> {
  const existingBadge = this.badges.find(
    (badge) => badge.name === badgeData.name
  );
  if (!existingBadge) {
    this.badges.push({
      ...badgeData,
      unlockedAt: new Date(),
    } as IBadge);
    return this.save();
  }
  return Promise.resolve(this);
};

// 静态方法：检查并奖励成就
StarLevelSchema.statics.checkAchievements = async function (
  studentId: mongoose.Types.ObjectId | string
) {
  const starLevel = await this.findOne({ student: studentId });
  if (!starLevel) return null;

  const achievements: Partial<IBadge>[] = [];

  // 连续学习成就
  if (starLevel.streaks.current === 7) {
    achievements.push({
      name: "一周达人",
      description: "连续学习7天",
      icon: "🔥",
      rarity: "rare",
    });
  } else if (starLevel.streaks.current === 30) {
    achievements.push({
      name: "月度冠军",
      description: "连续学习30天",
      icon: "👑",
      rarity: "epic",
    });
  }

  // 星星总数成就
  if (starLevel.totalStars === 50) {
    achievements.push({
      name: "半百之星",
      description: "获得50颗星星",
      icon: "⭐",
      rarity: "rare",
    });
  } else if (starLevel.totalStars === 100) {
    achievements.push({
      name: "百星达成",
      description: "获得100颗星星",
      icon: "🌟",
      rarity: "epic",
    });
  }

  // 解锁新徽章
  for (const achievement of achievements) {
    await starLevel.unlockBadge(achievement);
  }

  return achievements;
};

// 导出模型
export const StarAchievement: Model<IStarAchievement> =
  mongoose.models.StarAchievement ??
  mongoose.model<IStarAchievement>("StarAchievement", StarAchievementSchema);

export const StarLevel: IStarLevelModel =
  (mongoose.models.StarLevel as IStarLevelModel) ??
  mongoose.model<IStarLevel, IStarLevelModel>("StarLevel", StarLevelSchema);
