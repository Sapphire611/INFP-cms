"use client";
import { useState, useEffect } from "react";

import { TrendingUp, TrendingDown, Users, UserPlus, UserCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

import { useMovieStats } from "./request/get-movies-stats";
import { useUserStats } from "./request/get-user-stats";

function LoadingCards() {
  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i} className="@container/card">
          <CardHeader>
            <CardDescription className="bg-muted h-4 animate-pulse rounded" />
            <CardTitle className="bg-muted h-8 animate-pulse rounded" />
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}

function ErrorCard() {
  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Error</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">Failed to load</CardTitle>
        </CardHeader>
      </Card>
    </div>
  );
}

function TotalUsersCard({ totalUsers, monthly }: { totalUsers: number; monthly: number }) {
  return (
    <Card className="@container/card">
      <CardHeader>
        <CardDescription className="flex items-center gap-2">
          <Users className="size-4" />
          总用户数
        </CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
          {totalUsers.toLocaleString()}
        </CardTitle>
        <CardAction>
          <Badge variant="outline">
            <TrendingUp />+{((monthly / totalUsers) * 100).toFixed(1)}%
          </Badge>
        </CardAction>
      </CardHeader>
      {/* <CardFooter className="flex-col items-start gap-1.5 text-sm">
        <div className="line-clamp-1 flex gap-2 font-medium">
          用户总数持续增长 <TrendingUp className="size-4" />
        </div>
        <div className="text-muted-foreground">平台用户基础稳定</div>
      </CardFooter> */}
    </Card>
  );
}

function TotalMoviesCard({ totalMovies, monthly }: { totalMovies: number; monthly: number }) {
  return (
    <Card className="@container/card">
      <CardHeader>
        <CardDescription className="flex items-center gap-2">
          <Users className="size-4" />
          总电影数
        </CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
          {totalMovies.toLocaleString()}
        </CardTitle>
        <CardAction>
          <Badge variant="outline">
            <TrendingUp />+{((monthly / totalMovies) * 100).toFixed(1)}%
          </Badge>
        </CardAction>
      </CardHeader>
    </Card>
  );
}

export function SectionCards() {
  const { stats: userStats, loading: userLoading, error: userError } = useUserStats();
  const { stats: movieStats, loading: movieLoading, error: movieError } = useMovieStats();

  if (userLoading || movieLoading) {
    return <LoadingCards />;
  }

  if (userError || movieError || !userStats || !movieStats) {
    return <ErrorCard />;
  }

  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      <TotalUsersCard totalUsers={userStats.total} monthly={userStats.monthly} />
      <TotalMoviesCard totalMovies={movieStats.total} monthly={movieStats.monthly} />
    </div>
  );
}
