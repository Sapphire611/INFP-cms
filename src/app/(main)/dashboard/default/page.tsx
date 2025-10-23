import { ChartAreaInteractive } from "./_components/chart-area-interactive";
import { SectionCards } from "./_components/section-cards";

export default function Page() {
  return (
    <div className="@container/main flex flex-col gap-2 md:gap-6">
      <SectionCards />
      <ChartAreaInteractive />
      {/* <DataTable data={data} /> */}
    </div>
  );
}
