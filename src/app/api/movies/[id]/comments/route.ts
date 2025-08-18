import { NextRequest, NextResponse } from "next/server";

import mongoose from "mongoose";

import { withDBConnect } from "@/lib/mongoose";
import Comment from "@/models/comment";
import Movie from "@/models/movies";

interface CommentRequest {
  name: string;
  email: string;
  text: string;
}

// GET /api/movies/[movieId]/comments - 获取电影的评论列表
export const GET = withDBConnect(async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ movieId: string }> },
) {
  try {
    // Await params before accessing movieId
    const { movieId } = await params;

    // 验证电影ID格式
    if (!mongoose.isValidObjectId(movieId)) {
      return NextResponse.json({ error: "Invalid movie ID format" }, { status: 400 });
    }

    // 检查电影是否存在
    const movieExists = await Movie.exists({ _id: movieId });
    if (!movieExists) {
      return NextResponse.json({ error: "Movie not found" }, { status: 404 });
    }

    // 获取该电影的所有评论
    const comments = await Comment.find({ movie_id: movieId }).sort({ date: -1 });

    // 格式化评论数据
    const formattedComments = comments.map((comment) => ({
      ...comment.toObject(),
      date: comment.date.toISOString(),
      createdAt: comment.createdAt.toISOString(),
      updatedAt: comment.updatedAt.toISOString(),
    }));

    return NextResponse.json(formattedComments);
  } catch (error) {
    console.error("Error fetching comments:", error);
    return NextResponse.json({ error: "Failed to fetch comments" }, { status: 500 });
  }
});

// POST /api/movies/[movieId]/comments - 为电影添加评论
export const POST = withDBConnect(async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ movieId: string }> },
) {
  try {
    // Await params before accessing movieId
    const { movieId } = await params;
    const body: CommentRequest = await request.json();
    const { name, email, text } = body;

    // 验证电影ID格式
    if (!mongoose.isValidObjectId(movieId)) {
      return NextResponse.json({ error: "Invalid movie ID format" }, { status: 400 });
    }

    // 检查电影是否存在
    const movieExists = await Movie.exists({ _id: movieId });
    if (!movieExists) {
      return NextResponse.json({ error: "Movie not found" }, { status: 404 });
    }

    // 验证评论数据
    if (!name || !email || !text) {
      return NextResponse.json({ error: "Name, email, and text are required" }, { status: 400 });
    }

    // 创建新评论
    const comment = new Comment({
      name,
      email,
      movie_id: movieId,
      text,
      date: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await comment.save();

    // 更新电影的评论计数
    await Movie.findByIdAndUpdate(movieId, {
      $inc: { num_mflix_comments: 1 },
      lastupdated: new Date().toISOString(),
    });

    // 返回创建的评论
    const formattedComment = {
      ...comment.toObject(),
      date: comment.date.toISOString(),
      createdAt: comment.createdAt.toISOString(),
      updatedAt: comment.updatedAt.toISOString(),
    };

    return NextResponse.json(formattedComment, { status: 201 });
  } catch (error) {
    console.error("Error creating comment:", error);
    return NextResponse.json({ error: "Failed to create comment" }, { status: 500 });
  }
});
