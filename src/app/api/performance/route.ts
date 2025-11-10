import { NextRequest, NextResponse } from "next/server";

import CheckIn from "@/models/checkin";
import Child from "@/models/child";
import Class from "@/models/class";

// Helper function to build date range query
function buildDateRangeQuery(url: URL) {
  const startDate = url.searchParams.get("startDate");
  const endDate = url.searchParams.get("endDate");
  const dateQuery: Record<string, any> = {};

  if (startDate || endDate) {
    dateQuery["timestamps.submittedAt"] = {};
    if (startDate) {
      dateQuery["timestamps.submittedAt"].$gte = new Date(startDate);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999); // Include the entire end date
      dateQuery["timestamps.submittedAt"].$lte = end;
    }
  }

  return dateQuery;
}

// GET /api/performance - 获取学习表现数据
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const classId = url.searchParams.get("classId");

    // Build query conditions
    const dateQuery = buildDateRangeQuery(url);

    // Get students based on classId filter
    let studentQuery: Record<string, any> = {};
    if (classId) {
      studentQuery.class = classId;
    }

    const students = await Child.find(studentQuery)
      .populate("class", "name grade classCode")
      .select("name studentId class learningProgress")
      .lean();

    // Get check-in data for these students
    const studentIds = students.map((s) => s._id);

    const checkInQuery: Record<string, any> = {
      student: { $in: studentIds },
      status: "graded",
      ...dateQuery,
    };

    const checkIns = await CheckIn.aggregate([
      {
        $match: checkInQuery,
      },
      {
        $group: {
          _id: "$student",
          completedLessons: { $sum: 1 },
          totalStars: { $sum: "$evaluation.stars" },
          totalDuration: {
            $sum: {
              $reduce: {
                input: "$submission.mediaFiles",
                initialValue: 0,
                in: {
                  $add: ["$$value", { $ifNull: ["$$this.duration", 0] }],
                },
              },
            },
          },
          averageStars: { $avg: "$evaluation.stars" },
          excellentCount: {
            $sum: {
              $cond: ["$evaluation.isExcellent", 1, 0],
            },
          },
        },
      },
    ]);

    // Create a map for quick lookup
    const checkInMap = new Map();
    checkIns.forEach((ci) => {
      checkInMap.set(ci._id.toString(), ci);
    });

    // Combine student data with check-in statistics
    const performanceData = students.map((student: any) => {
      const checkInData = checkInMap.get(student._id.toString());
      const completedLessons = checkInData?.completedLessons || 0;
      const totalStars = checkInData?.totalStars || 0;
      const totalDuration = checkInData?.totalDuration || 0;
      const averageStars = checkInData?.averageStars || 0;
      const excellentCount = checkInData?.excellentCount || 0;

      // Calculate performance rating
      let rating = "需加油";
      if (averageStars >= 4.5) {
        rating = "优秀";
      } else if (averageStars >= 3.5) {
        rating = "良好";
      } else if (averageStars >= 2.5) {
        rating = "中等";
      }

      return {
        studentId: student._id,
        studentName: student.name,
        studentCode: student.studentId,
        className: student.class?.name || "未分配",
        grade: student.class?.grade || "未知",
        completedLessons,
        totalStars,
        learningDuration: Math.round(totalDuration / 60), // Convert to minutes
        averageStars: Math.round(averageStars * 10) / 10, // Round to 1 decimal
        excellentCount,
        rating,
        progress: student.learningProgress?.completedLessons || 0,
        totalProgress: student.learningProgress?.totalLessons || 0,
      };
    });

    // Sort by total stars (descending)
    performanceData.sort((a, b) => b.totalStars - a.totalStars);

    return NextResponse.json({
      data: performanceData,
      total: performanceData.length,
    });
  } catch (error: unknown) {
    console.error("Error fetching performance data:", error);
    const message = error instanceof Error ? error.message : "An unexpected error occurred";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
