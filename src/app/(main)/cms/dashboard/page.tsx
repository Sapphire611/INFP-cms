import { StatsCards } from "./_components/stats-cards";
import { GrowthTrendChart } from "./_components/growth-trend-chart";
import { ActivityChart } from "./_components/activity-chart";
import { UserDistributionChart } from "./_components/user-distribution-chart";
import { RecentActivity } from "./_components/recent-activity";

export default function Page() {
  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      {/* 统计卡片 */}
      <StatsCards />

      {/* 增长趋势图 */}
      <GrowthTrendChart />

      {/* 双列布局 */}
      <div className="grid grid-cols-1 gap-4 md:gap-6 @4xl/main:grid-cols-2">
        <ActivityChart />
        <UserDistributionChart />
      </div>

      {/* 最近活动 */}
      <RecentActivity />
    </div>
  );
}
