import { ChartUserGrowth } from "./_components/chart-user-growth";
import { SectionCards } from "./_components/section-cards";

export default function Page() {
  return (
    <div className="@container/main flex flex-col gap-2 md:gap-6">
      <SectionCards />
      <ChartUserGrowth />
      {/* <DataTable data={data} /> */}
    </div>
  );
}
