import { getProjectTrends, OneYearSnapshots } from "@/drizzle/projects";
import { formatStars } from "@/lib/format-helpers";

type Props = {
  snapshots: OneYearSnapshots[];
};
export function ViewTrends({ snapshots }: Props) {
  const trends = getProjectTrends(snapshots);

  return (
    <div>
      <div className="mb-4 text-lg font-bold">趋势</div>
      <div className="grid grid-cols-4 gap-2">
        <label>今日</label>
        <label>本周</label>
        <label>本月</label>
        <label>今年</label>
        <div>{trends.daily ? formatStars(trends.daily) : "-"}</div>
        <div>{trends.weekly ? formatStars(trends.weekly) : "-"}</div>
        <div>{trends.monthly ? formatStars(trends.monthly) : "-"}</div>
        <div>{trends.yearly ? formatStars(trends.yearly) : "-"}</div>
      </div>
    </div>
  );
}
