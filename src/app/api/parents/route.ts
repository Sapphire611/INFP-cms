import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import Parent from "@/models/parent";
import Child from "@/models/child";
import { CreateParentRequest } from "@/types/parent";

// Helper function to extract and validate pagination parameters
function extractPaginationParams(url: URL) {
  const pageParam = url.searchParams.get("page");
  const limitParam = url.searchParams.get("limit");
  const page = pageParam ? parseInt(pageParam) : 1;
  const limit = limitParam ? parseInt(limitParam) : 20;
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

// Helper function to build query conditions
function buildQueryConditions(url: URL) {
  const query: Record<string, any> = {};
  const search = url.searchParams.get("search") ?? "";
  const isActive = url.searchParams.get("isActive");

  if (search) {
    query.$or = [
      { "profile.name": { $regex: search, $options: "i" } },
      { "profile.phone": { $regex: search, $options: "i" } },
    ];
  }

  if (isActive !== null && isActive !== undefined && isActive !== "") {
    query.isActive = isActive === "true";
  }

  return query;
}

// GET /api/parents - 获取家长列表
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const url = new URL(request.url);

    // Extract and validate parameters
    const { page, limit, skip } = extractPaginationParams(url);
    const query = buildQueryConditions(url);

    // Database operations
    const total = await Parent.countDocuments(query);
    const parents = await Parent.find(query)
      .populate("children", "name studentId class") // 填充子女信息
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Format and return data
    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      data: parents,
      pagination: {
        total,
        page,
        limit,
        totalPages,
      },
    });
  } catch (error: unknown) {
    console.error("Error fetching parents:", error);
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/parents - 创建新家长
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body: CreateParentRequest = await request.json();
    const { profile, children, openid, wechatInfo } = body;

    // 验证必填字段
    if (!profile?.name) {
      return NextResponse.json(
        { error: "Parent name is required" },
        { status: 400 }
      );
    }

    // 检查openid是否已存在（如果提供）
    if (openid) {
      const existingParent = await Parent.findOne({ openid });
      if (existingParent) {
        return NextResponse.json(
          { error: "Parent with this openid already exists" },
          { status: 409 }
        );
      }
    }

    // 创建新家长
    const newParent = new Parent({
      profile: {
        name: profile.name,
        phone: profile.phone,
        idNumber: profile.idNumber,
      },
      children: children || [],
      openid,
      wechatInfo,
      isActive: true,
    });

    await newParent.save();

    // 返回创建的家长
    const populatedParent = await Parent.findById(newParent._id)
      .populate("children", "name studentId class")
      .lean();

    return NextResponse.json(populatedParent, { status: 201 });
  } catch (error: unknown) {
    console.error("Error creating parent:", error);
    const message =
      error instanceof Error ? error.message : "Failed to create parent";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
