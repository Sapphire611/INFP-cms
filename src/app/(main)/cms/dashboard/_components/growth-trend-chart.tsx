"use client";

import * as React from "react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const chartConfig = {
  cms: {
    label: "后台用户",
    color: "var(--chart-1)",
  },
  wechat: {
    label: "微信用户",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

interface GrowthData {
  date: string;
  cms: number;
  wechat: number;
}

export function GrowthTrendChart() {
  const [chartData, setChartData] = React.useState<GrowthData[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [period, setPeriod] = React.useState<"7d" | "30d" | "90d">("30d");

  React.useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/dashboard/growth?period=${period}`);
        if (!response.ok) throw new Error("Failed to fetch data");
        const data = await response.json();
        setChartData(data);
      } catch (error) {
        console.error("Error fetching growth data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [period]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>用户增长趋势</CardTitle>
          <CardDescription>后台用户与微信用户增长对比</CardDescription>
        </CardHeader>
        <CardContent className="flex h-[350px] items-center justify-center">
          <div className="border-primary h-6 w-6 animate-spin rounded-full border-2 border-t-transparent" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>用户增长趋势</CardTitle>
        <CardDescription>后台用户与微信用户增长对比</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={period} onValueChange={(v) => setPeriod(v as typeof period)} className="mb-4">
          <TabsList>
            <TabsTrigger value="7d">近7天</TabsTrigger>
            <TabsTrigger value="30d">近30天</TabsTrigger>
            <TabsTrigger value="90d">近90天</TabsTrigger>
          </TabsList>
        </Tabs>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <AreaChart
            data={chartData}
            margin={{
              left: 12,
              right: 12,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => {
                const date = new Date(value);
                return date.toLocaleDateString("zh-CN", {
                  month: "short",
                  day: "numeric",
                });
              }}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => {
                    return new Date(value).toLocaleDateString("zh-CN", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    });
                  }}
                />
              }
            />
            <Area
              dataKey="cms"
              type="monotone"
              fill="var(--color-cms)"
              fillOpacity={0.4}
              stroke="var(--color-cms)"
              stackId="a"
            />
            <Area
              dataKey="wechat"
              type="monotone"
              fill="var(--color-wechat)"
              fillOpacity={0.4}
              stroke="var(--color-wechat)"
              stackId="a"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
