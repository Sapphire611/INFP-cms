"use client";

import * as React from "react";
import { Pie, PieChart, Cell, Legend } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

interface DistributionData {
  adminUsers: number;
  regularUsers: number;
  activeWechatUsers: number;
  inactiveWechatUsers: number;
}

const chartConfig = {
  admin: {
    label: "管理员",
    color: "var(--chart-1)",
  },
  user: {
    label: "普通用户",
    color: "var(--chart-2)",
  },
  activeWechat: {
    label: "活跃微信用户",
    color: "var(--chart-3)",
  },
  inactiveWechat: {
    label: "非活跃微信用户",
    color: "var(--chart-4)",
  },
} satisfies ChartConfig;

export function UserDistributionChart() {
  const [data, setData] = React.useState<DistributionData | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("/api/dashboard/distribution");
        if (!response.ok) throw new Error("Failed to fetch data");
        const result = await response.json();
        setData(result);
      } catch (error) {
        console.error("Error fetching distribution data:", error);
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
          <CardTitle>用户类型分布</CardTitle>
          <CardDescription>各类用户占比统计</CardDescription>
        </CardHeader>
        <CardContent className="flex h-[300px] items-center justify-center">
          <div className="border-primary h-6 w-6 animate-spin rounded-full border-2 border-t-transparent" />
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const chartData = [
    { name: "管理员", value: data.adminUsers, fill: "var(--color-admin)" },
    { name: "普通用户", value: data.regularUsers, fill: "var(--color-user)" },
    { name: "活跃微信用户", value: data.activeWechatUsers, fill: "var(--color-activeWechat)" },
    { name: "非活跃微信用户", value: data.inactiveWechatUsers, fill: "var(--color-inactiveWechat)" },
  ].filter(item => item.value > 0); // 过滤掉值为0的数据

  // 如果没有数据，显示提示
  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>用户类型分布</CardTitle>
          <CardDescription>各类用户占比统计</CardDescription>
        </CardHeader>
        <CardContent className="flex h-[300px] items-center justify-center">
          <p className="text-muted-foreground text-sm">暂无数据</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>用户类型分布</CardTitle>
        <CardDescription>各类用户占比统计</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <ChartTooltip content={<ChartTooltipContent />} />
            <Legend />
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
