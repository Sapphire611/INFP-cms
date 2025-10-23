import { NextRequest, NextResponse } from "next/server";

import { withDBConnect } from "@/lib/mongoose";
import Movies from "@/models/movies";
import { MovieRequest } from "@/types/movie";

// GET /api/movies - 获取电影列表（带分页和筛选）
export const GET = withDBConnect(async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") ?? "1", 10);
    const limit = parseInt(searchParams.get("limit") ?? "20", 10);
    const skip = (page - 1) * limit;

    // 构建查询条件
    const query: any = {};

    // 标题筛选
    const title = searchParams.get("title");
    if (title) {
      query.title = { $regex: title, $options: "i" };
    }

    // 年份筛选
    const year = searchParams.get("year");
    if (year) {
      query.year = parseInt(year, 10);
    }

    // 类型筛选
    const genre = searchParams.get("genre");
    if (genre) {
      query.genres = genre;
    }

    // 构建排序条件
    const sortField = searchParams.get("sortField") ?? "createdAt";
    const sortOrder = searchParams.get("sortOrder") === "desc" ? -1 : 1;
    const sortCriteria: any = {};
    sortCriteria[sortField] = sortOrder;

    // 执行查询，只返回需要的字段以提高性能
    const movies = await Movies.find(query)
      .select("title year genres runtime imdb.rating rated _id")
      .sort(sortCriteria)
      .skip(skip)
      .limit(limit);

    // 获取总条数用于计算总页数
    const total = await Movies.countDocuments(query);

    return NextResponse.json({
      data: movies,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "An unexpected error occurred";
    return NextResponse.json({ error: message }, { status: 500 });
  }
});

// POST /api/movies - 创建新电影
export const POST = withDBConnect(async function POST(request: NextRequest) {
  try {
    const body: MovieRequest = await request.json();

    // 创建新电影
    const movie = new Movies({
      ...body,
      lastupdated: new Date().toISOString(),
      type: "movie",
      tomatoes: {
        viewer: {
          rating: body.imdb?.rating ?? 0,
          numReviews: 0,
          meter: 0,
        },
        fresh: 0,
        critic: {
          rating: 0,
          numReviews: 0,
          meter: 0,
        },
        rotten: 0,
        lastUpdated: new Date(),
      },
      num_mflix_comments: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await movie.save();

    // 返回创建的电影
    const formattedMovie = {
      ...movie.toObject(),
      released: movie.released.toISOString(),
      createdAt: movie.createdAt.toISOString(),
      updatedAt: movie.updatedAt.toISOString(),
    };

    return NextResponse.json(formattedMovie, { status: 201 });
  } catch (error) {
    console.error("Error creating movie:", error);
    return NextResponse.json({ error: "Failed to create movie" }, { status: 500 });
  }
});

// PUT /api/movies/:id - 更新电影信息
export const PUT = withDBConnect(async function PUT(request: NextRequest) {
  try {
    // 获取URL中的电影ID
    const url = new URL(request.url);
    const movieId = url.pathname.split("/").pop();

    if (!movieId) {
      return NextResponse.json({ error: "Movie ID is required" }, { status: 400 });
    }

    const body: MovieRequest = await request.json();

    // 查找电影
    const movie = await Movies.findById(movieId);
    if (!movie) {
      return NextResponse.json({ error: "Movie not found" }, { status: 404 });
    }

    // 更新电影信息
    Object.assign(movie, body);
    movie.updatedAt = new Date();
    movie.lastupdated = new Date().toISOString();

    await movie.save();

    // 返回更新后的电影
    const formattedMovie = {
      ...movie.toObject(),
      released: movie.released.toISOString(),
      createdAt: movie.createdAt.toISOString(),
      updatedAt: movie.updatedAt.toISOString(),
    };

    return NextResponse.json(formattedMovie);
  } catch (error) {
    console.error("Error updating movie:", error);
    return NextResponse.json({ error: "Failed to update movie" }, { status: 500 });
  }
});