import { NextRequest, NextResponse } from "next/server";

import { withDBConnect } from "@/lib/mongoose";
import Movie from "@/models/movies";
import { MovieRequest } from "@/types/movie";

// GET /api/movies/[id] - 获取单个电影
export const GET = withDBConnect(async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Await params before accessing id
    const { id } = await params;
    const movie = await Movie.findById(id);

    if (!movie) {
      return NextResponse.json({ error: "Movie not found" }, { status: 404 });
    }

    // 确保日期字段是字符串格式
    const movieWithStringDates = {
      ...movie.toObject(),
      released: movie.released.toISOString(),
      createdAt: movie.createdAt.toISOString(),
      updatedAt: movie.updatedAt.toISOString(),
    };

    return NextResponse.json(movieWithStringDates);
  } catch (error) {
    console.error("Error fetching movie:", error);
    return NextResponse.json({ error: "Failed to fetch movie" }, { status: 500 });
  }
});

// PATCH /api/movies/[id] - 更新单个电影
export const PATCH = withDBConnect(async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Await params before accessing id
    const { id } = await params;
    const body: MovieRequest = await request.json();

    // 查找电影
    const existingMovie = await Movie.findById(id);

    if (!existingMovie) {
      return NextResponse.json({ error: "Movie not found" }, { status: 404 });
    }

    // 更新电影
    const updatedMovie = await Movie.findByIdAndUpdate(id, body, { new: true });

    // 确保日期字段是字符串格式
    const movieWithStringDates = {
      ...updatedMovie.toObject(),
      released: updatedMovie.released.toISOString(),
      createdAt: updatedMovie.createdAt.toISOString(),
      updatedAt: updatedMovie.updatedAt.toISOString(),
    };

    return NextResponse.json(movieWithStringDates);
  } catch (error) {
    console.error("Error updating movie:", error);
    return NextResponse.json({ error: "Failed to update movie" }, { status: 500 });
  }
});

// DELETE /api/movies/[id] - 删除单个电影
export const DELETE = withDBConnect(async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Await params before accessing id
    const { id } = await params;
    const movie = await Movie.findByIdAndDelete(id);

    if (!movie) {
      return NextResponse.json({ error: "Movie not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Movie deleted successfully" });
  } catch (error) {
    console.error("Error deleting movie:", error);
    return NextResponse.json({ error: "Failed to delete movie" }, { status: 500 });
  }
});
