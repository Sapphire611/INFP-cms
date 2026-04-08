"use client";

import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, Users, UserCheck, UserPlus, Activity } from "lucide-react";
import { Card, CardHeader, CardDescription, CardTitle, CardAction } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface SystemStats {
  totalUsers: number;
  totalWechatUsers: number;
  activeWechatUsers: number;
  weeklyNewUsers: number;
  weeklyNewWechatUsers: number;
  userGrowthRate: number;
  wechatGrowthRate: number;
  activeRate: number;
}

function LoadingCards() {
  return (
    <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
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
    <Card className="@container/card">
      <CardHeader>
        <CardDescription>错误</CardDescription>
        <CardTitle className="text-2xl font-semibold">加载失败</CardTitle>
      </CardHeader>
    </Card>
  );
}

function TrendBadge({ value, suffix = "%" }: { value: number; suffix?: string }) {
  const isPositive = value >= 0;
  const Icon = isPositive ? TrendingUp : TrendingDown;

  return (
    <Badge variant={isPositive ? "default" : "destructive"} className="gap-1">
      <Icon className="size-3" />
      {Math.abs(value).toFixed(1)}{suffix}
    </Badge>
  );
}

export function StatsCards() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch("/api/dashboard/stats");
        if (!response.ok) throw new Error("Failed to fetch stats");
        const data = await response.json();
        setStats(data);
      } catch (error) {
        console.error("Error fetching dashboard stats:", error);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) return <LoadingCards />;
  if (error || !stats) return <ErrorCard />;

  return (
    <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      <Card className="@container/card bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/20 dark:to-card">
        <CardHeader>
          <CardDescription className="flex items-center gap-2">
            <Users className="size-4" />
            后台用户总数
          </CardDescription>
          <CardTitle className="text-3xl font-bold tabular-nums">
            {stats.totalUsers.toLocaleString()}
          </CardTitle>
          <CardAction>
            <TrendBadge value={stats.userGrowthRate} />
          </CardAction>
        </CardHeader>
      </Card>

      <Card className="@container/card bg-gradient-to-br from-green-50 to-white dark:from-green-950/20 dark:to-card">
        <CardHeader>
          <CardDescription className="flex items-center gap-2">
            <Users className="size-4" />
            微信用户总数
          </CardDescription>
          <CardTitle className="text-3xl font-bold tabular-nums">
            {stats.totalWechatUsers.toLocaleString()}
          </CardTitle>
          <CardAction>
            <TrendBadge value={stats.wechatGrowthRate} />
          </CardAction>
        </CardHeader>
      </Card>

      <Card className="@container/card bg-gradient-to-br from-purple-50 to-white dark:from-purple-950/20 dark:to-card">
        <CardHeader>
          <CardDescription className="flex items-center gap-2">
            <UserCheck className="size-4" />
            活跃用户
          </CardDescription>
          <CardTitle className="text-3xl font-bold tabular-nums">
            {stats.activeWechatUsers.toLocaleString()}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className="gap-1">
              <Activity className="size-3" />
              {stats.activeRate.toFixed(1)}%
            </Badge>
          </CardAction>
        </CardHeader>
      </Card>

      <Card className="@container/card bg-gradient-to-br from-orange-50 to-white dark:from-orange-950/20 dark:to-card">
        <CardHeader>
          <CardDescription className="flex items-center gap-2">
            <UserPlus className="size-4" />
            本周新增
          </CardDescription>
          <CardTitle className="text-3xl font-bold tabular-nums">
            {(stats.weeklyNewUsers + stats.weeklyNewWechatUsers).toLocaleString()}
          </CardTitle>
          <CardAction>
            <Badge variant="secondary">
              本周
            </Badge>
          </CardAction>
        </CardHeader>
      </Card>
    </div>
  );
}
