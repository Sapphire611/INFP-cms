import mongoose from "mongoose";

import { connectDB } from "@/lib/mongoose";
import User from "@/models/user";
import Parent from "@/models/parent";
import Child from "@/models/child";

/**
 * 数据迁移脚本：将 User 模型中的 parent 类型用户迁移到 Parent 模型
 *
 * 执行命令：
 * npx ts-node --compiler-options '{"module":"CommonJS"}' src/scripts/migrate-parents.ts
 */

async function migrateParents() {
  try {
    await connectDB();
    console.log("✅ Connected to MongoDB successfully\n");

    // 1. 查找所有 parent 类型的用户
    const parentUsers = await User.find({ userType: "parent" });
    console.log(`📊 Found ${parentUsers.length} parent users to migrate\n`);

    if (parentUsers.length === 0) {
      console.log("✨ No parent users found. Migration not needed.");
      return;
    }

    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const user of parentUsers) {
      try {
        // 检查是否已经迁移过
        const existingParent = await Parent.findOne({
          $or: [
            { openid: user.openid },
            { "profile.phone": user.profile?.phone }
          ]
        });

        if (existingParent) {
          console.log(`⏭️  Skipped: ${user.profile?.name} (already exists)`);
          skippedCount++;
          continue;
        }

        // 创建新的 Parent 文档
        const newParent = new Parent({
          profile: {
            name: user.profile?.name || user.username,
            phone: user.profile?.phone,
            avatar: user.profile?.avatar,
          },
          children: user.parentInfo?.children || [],
          openid: user.openid,
          isActive: user.isActive,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        });

        await newParent.save();

        // 更新 Child 模型中的引用
        if (user.parentInfo?.children && user.parentInfo.children.length > 0) {
          for (const childId of user.parentInfo.children) {
            await Child.updateMany(
              {
                "parents.user": user._id
              },
              {
                $set: { "parents.$[elem].user": newParent._id }
              },
              {
                arrayFilters: [{ "elem.user": user._id }]
              }
            );
          }
        }

        console.log(`✅ Migrated: ${user.profile?.name} (${user.email}) -> Parent ID: ${newParent._id}`);
        migratedCount++;

        // 可选：删除旧的 User 记录（注释掉以保持安全）
        // await User.findByIdAndDelete(user._id);

      } catch (error) {
        console.error(`❌ Error migrating user ${user.email}:`, error);
        errorCount++;
      }
    }

    console.log("\n" + "=".repeat(60));
    console.log("📈 Migration Summary:");
    console.log("=".repeat(60));
    console.log(`✅ Successfully migrated: ${migratedCount}`);
    console.log(`⏭️  Skipped (already exists): ${skippedCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`📊 Total processed: ${parentUsers.length}`);
    console.log("=".repeat(60) + "\n");

    console.log("⚠️  注意：旧的 User 记录未被删除，请手动检查后删除");
    console.log("💡 提示：可以运行以下命令删除已迁移的 parent 用户：");
    console.log('   db.users.deleteMany({ userType: "parent" })\n');

  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
    process.exit(0);
  }
}

// 执行迁移
migrateParents();
