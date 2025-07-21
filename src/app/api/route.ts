import { NextRequest, NextResponse } from "next/server";
// GET /api 测试接口
export async function GET() {
  try {
    return NextResponse.json({
      code: 200,
      message: "success",
      data: {
        name: "John Doe",
        email: "john.doe@example.com",
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error }, { status: 500 });
  }
}
