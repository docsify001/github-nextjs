import { getProjectMonthlyTrends, OneYearSnapshots } from "@/drizzle/projects";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatStars } from "@/lib/format-helpers";
import { AddSnapshotButton } from "./add-snapshot-button";
import { MonthlyTrendsChart } from "./monthly-trends-chart";

type Props = {
  snapshots: OneYearSnapshots[];
  slug: string;
  repoFullName: string;
  repoId: string;
};

export function ViewSnapshots({
  snapshots,
  repoFullName,
  repoId,
  slug,
}: Props) {
  return (
    <div className="rounded border p-4">
      <div className="flex items-center justify-between">
        <h3 className="pb-4 text-2xl">快照数据</h3>
        <AddSnapshotButton
          slug={slug}
          repoId={repoId}
          repoFullName={repoFullName}
        />
      </div>
      <div className="flex flex-col gap-4">
        <Chart snapshots={snapshots} />
        {snapshots.map((oneYearSnapshot) => (
          <ViewYear key={oneYearSnapshot.year} snapshots={oneYearSnapshot} />
        ))}
      </div>
    </div>
  );
}

function Chart({ snapshots }: { snapshots: Props["snapshots"] }) {
  const monthlyTrends = getProjectMonthlyTrends(snapshots);

  const results = monthlyTrends.map(({ year, month, delta }) => ({
    year,
    month,
    value: delta,
  }));
  return (
    <Card>
      <CardHeader>
        <CardTitle>月度趋势</CardTitle>
      </CardHeader>
      <CardContent>
        <MonthlyTrendsChart results={results} unit="Stars" />
      </CardContent>
    </Card>
  );
}

function ViewYear({ snapshots }: { snapshots: Props["snapshots"][number] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{snapshots.year} 年</CardTitle>
      </CardHeader>
      <CardContent>
        <Table className="w-auto">
          <TableHeader>
            <TableRow>
              <TableCell className="w-24">月份</TableCell>
              <TableCell className="w-12">记录数</TableCell>
              <TableCell className="w-12">开始日期</TableCell>
              <TableCell className="w-24">开始 Stars</TableCell>
              <TableCell className="w-12">结束日期</TableCell>
              <TableCell className="w-24">结束 Stars</TableCell>
              <TableCell className="w-20">开始 Forks</TableCell>
              <TableCell className="w-20">结束 Forks</TableCell>
              <TableCell className="w-20">开始 Watchers</TableCell>
              <TableCell className="w-20">结束 Watchers</TableCell>
              <TableCell className="w-20">开始 PRs</TableCell>
              <TableCell className="w-20">结束 PRs</TableCell>
              <TableCell className="w-20">开始 Releases</TableCell>
              <TableCell className="w-20">结束 Releases</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {snapshots.months.map((item) => (
              <MonthSummary key={item.month} monthlySnapshots={item} />
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function MonthSummary({
  monthlySnapshots,
}: {
  monthlySnapshots: OneYearSnapshots["months"][number];
}) {
  const { month, snapshots } = monthlySnapshots;
  const firstSnapshot = snapshots[0];
  const lastSnapshot = snapshots.length > 1 && snapshots.at(-1);

  return (
    <TableRow>
      <TableCell className="mr-2 w-24 font-bold">{months[month - 1]}</TableCell>
      <TableCell className="w-12">{snapshots.length}</TableCell>
      <TableCell className="w-12">{firstSnapshot.day}</TableCell>
      <TableCell className="w-24">{formatStars(firstSnapshot.stars)}</TableCell>
      <TableCell className="w-12">
        {lastSnapshot ? lastSnapshot.day : "-"}
      </TableCell>
      <TableCell className="w-24">
        {lastSnapshot ? formatStars(lastSnapshot.stars) : ""}
      </TableCell>
      <TableCell className="w-20">
        {firstSnapshot.forks || "-"}
      </TableCell>
      <TableCell className="w-20">
        {lastSnapshot ? (lastSnapshot.forks || "-") : "-"}
      </TableCell>
      <TableCell className="w-20">
        {firstSnapshot.watchers || "-"}
      </TableCell>
      <TableCell className="w-20">
        {lastSnapshot ? (lastSnapshot.watchers || "-") : "-"}
      </TableCell>
      <TableCell className="w-20">
        {firstSnapshot.pullRequests || "-"}
      </TableCell>
      <TableCell className="w-20">
        {lastSnapshot ? (lastSnapshot.pullRequests || "-") : "-"}
      </TableCell>
      <TableCell className="w-20">
        {firstSnapshot.releases || "-"}
      </TableCell>
      <TableCell className="w-20">
        {lastSnapshot ? (lastSnapshot.releases || "-") : "-"}
      </TableCell>
    </TableRow>
  );
}

const months = [
  "一月",
  "二月",
  "三月",
  "四月",
  "五月",
  "六月",
  "七月",
  "八月",
  "九月",
  "十月",
  "十一月",
  "十二月",
];
