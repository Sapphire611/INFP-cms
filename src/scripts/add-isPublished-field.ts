import { connectDB } from "@/lib/mongoose";
import Course from "@/models/course";

async function addIsPublishedField() {
  try {
    console.log("连接数据库...");
    await connectDB();

    console.log("开始更新课程数据...");

    // 为所有没有 isPublished 字段的课程添加该字段，默认值为 false
    const result = await Course.updateMany(
      { isPublished: { $exists: false } },
      { $set: { isPublished: false } }
    );

    console.log(`✅ 成功更新 ${result.modifiedCount} 个课程`);

    // 显示所有课程的发布状态
    const allCourses = await Course.find({}).select("title isPublished").lean();
    console.log("\n当前所有课程的发布状态：");
    allCourses.forEach((course) => {
      console.log(`- ${course.title}: ${course.isPublished ? "已发布" : "未发布"}`);
    });

    process.exit(0);
  } catch (error) {
    console.error("❌ 更新失败:", error);
    process.exit(1);
  }
}

addIsPublishedField();
