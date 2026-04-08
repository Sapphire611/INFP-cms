"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface RecentUser {
  id: string;
  name: string;
  avatar?: string;
  type: "cms" | "wechat";
  action: "login" | "register";
  timestamp: string;
}

export function RecentActivity() {
  const [activities, setActivities] = React.useState<RecentUser[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("/api/dashboard/recent-activity");
        if (!response.ok) throw new Error("Failed to fetch data");
        const data = await response.json();
        setActivities(data);
      } catch (error) {
        console.error("Error fetching recent activity:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>最近活动</CardTitle>
          <CardDescription>最新的用户登录和注册记录</CardDescription>
        </CardHeader>
        <CardContent className="flex h-[300px] items-center justify-center">
          <div className="border-primary h-6 w-6 animate-spin rounded-full border-2 border-t-transparent" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>最近活动</CardTitle>
        <CardDescription>最新的用户登录和注册记录</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px] pr-4">
          <div className="space-y-4">
            {activities.length === 0 ? (
              <p className="text-muted-foreground text-center text-sm">暂无活动记录</p>
            ) : (
              activities.map((activity) => (
                <div key={activity.id} className="flex items-center gap-4">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={activity.avatar} alt={activity.name} />
                    <AvatarFallback>{activity.name.slice(0, 2)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium leading-none">{activity.name}</p>
                    <p className="text-muted-foreground text-xs">
                      {new Date(activity.timestamp).toLocaleString("zh-CN")}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant={activity.type === "cms" ? "default" : "secondary"}>
                      {activity.type === "cms" ? "后台" : "微信"}
                    </Badge>
                    <Badge variant={activity.action === "register" ? "outline" : "secondary"}>
                      {activity.action === "register" ? "注册" : "登录"}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
