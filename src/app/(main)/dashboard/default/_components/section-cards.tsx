"use client";

import { TrendingUp, TrendingDown, Users, UserPlus, UserCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useUserStats } from "@/hooks/use-user-stats";

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

function TotalUsersCard({ totalUsers }: { totalUsers  : number }) {
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
            <TrendingUp />+{((totalUsers / 1000) * 100).toFixed(1)}%
          </Badge>
        </CardAction>
      </CardHeader>
      <CardFooter className="flex-col items-start gap-1.5 text-sm">
        <div className="line-clamp-1 flex gap-2 font-medium">
          用户总数持续增长 <TrendingUp className="size-4" />
        </div>
        <div className="text-muted-foreground">平台用户基础稳定</div>
      </CardFooter>
    </Card>
  );
}

function NewUsers7DaysCard({
  newUsersLast7Days,
  trendDirection,
  trendPercentage,
}: {
  newUsersLast7Days: number;
  trendDirection: "up" | "down";
  trendPercentage: number;
}) {
  return (
    <Card className="@container/card">
      <CardHeader>
        <CardDescription className="flex items-center gap-2">
          <UserPlus className="size-4" />
          7天内新增用户
        </CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
          {newUsersLast7Days.toLocaleString()}
        </CardTitle>
        <CardAction>
          <Badge variant="outline">
            {trendDirection === "up" ? <TrendingUp /> : <TrendingDown />}
            {trendDirection === "up" ? "+" : ""}
            {trendPercentage}%
          </Badge>
        </CardAction>
      </CardHeader>
      <CardFooter className="flex-col items-start gap-1.5 text-sm">
        <div className="line-clamp-1 flex gap-2 font-medium">
          {trendDirection === "up" ? "用户增长趋势良好" : "需要关注用户获取"}
          {trendDirection === "up" ? <TrendingUp className="size-4" /> : <TrendingDown className="size-4" />}
        </div>
        <div className="text-muted-foreground">
          {trendDirection === "up" ? "用户获取策略有效" : "建议优化用户获取策略"}
        </div>
      </CardFooter>
    </Card>
  );
}

function ActiveAccountsCard({ totalUsers }: { totalUsers: number }) {
  return (
    <Card className="@container/card">
      <CardHeader>
        <CardDescription className="flex items-center gap-2">
          <UserCheck className="size-4" />
          活跃账户
        </CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
          {(totalUsers * 0.85).toFixed(0)}
        </CardTitle>
        <CardAction>
          <Badge variant="outline">
            <TrendingUp />
            +85%
          </Badge>
        </CardAction>
      </CardHeader>
      <CardFooter className="flex-col items-start gap-1.5 text-sm">
        <div className="line-clamp-1 flex gap-2 font-medium">
          用户活跃度良好 <TrendingUp className="size-4" />
        </div>
        <div className="text-muted-foreground">用户参与度超过目标</div>
      </CardFooter>
    </Card>
  );
}

function TodayNewUsersCard({
  newUsersToday,
  trendDirection,
  trendPercentage,
}: {
  newUsersToday: number;
  trendDirection: "up" | "down";
  trendPercentage: number;
}) {
  return (
    <Card className="@container/card">
      <CardHeader>
        <CardDescription className="flex items-center gap-2">
          <UserPlus className="size-4" />
          今日新增用户
        </CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
          {newUsersToday.toLocaleString()}
        </CardTitle>
        <CardAction>
          <Badge variant="outline">
            {trendDirection === "up" ? <TrendingUp /> : <TrendingDown />}
            {trendDirection === "up" ? "+" : ""}
            {trendPercentage}%
          </Badge>
        </CardAction>
      </CardHeader>
      <CardFooter className="flex-col items-start gap-1.5 text-sm">
        <div className="line-clamp-1 flex gap-2 font-medium">
          {trendDirection === "up" ? "今日用户增长" : "今日用户减少"}
          {trendDirection === "up" ? <TrendingUp className="size-4" /> : <TrendingDown className="size-4" />}
        </div>
        <div className="text-muted-foreground">{trendDirection === "up" ? "用户注册活跃" : "需要关注用户获取"}</div>
      </CardFooter>
    </Card>
  );
}

export function SectionCards() {
  const { stats, loading, error } = useUserStats();

  if (loading) {
    return <LoadingCards />;
  }

  if (error || !stats) {
    return <ErrorCard />;
  }

  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      <TotalUsersCard totalUsers={stats.totalUsers} />
      <NewUsers7DaysCard
        newUsersLast7Days={stats.newUsersLast7Days}
        trendDirection={stats.trendDirection}
        trendPercentage={stats.trendPercentage}
      />
      {/* <ActiveAccountsCard totalUsers={stats.totalUsers} /> */}
      {/* <TodayNewUsersCard
        newUsersToday={stats.newUsersToday}
        trendDirection={stats.trendDirection}
        trendPercentage={stats.trendPercentage}
      /> */}
    </div>
  );
}
