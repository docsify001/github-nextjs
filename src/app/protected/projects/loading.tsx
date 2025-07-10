import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export default function ProjectsLoading() {
  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="flex justify-between">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-24" />
          <Badge className="text-sm">
            <Skeleton className="h-4 w-8" />
          </Badge>
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      {/* 搜索框骨架 */}
      <Skeleton className="h-10 w-full max-w-md" />

      {/* 表格骨架 */}
      <div className="space-y-4">
        <div className="flex w-full justify-between items-center">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>

        <div className="border rounded-lg p-4">
          <div className="space-y-3">
            {/* 表头 */}
            <div className="grid grid-cols-4 gap-4 pb-2 border-b">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-12" />
            </div>
            
            {/* 表格行 */}
            {Array.from({ length: 20 }).map((_, i) => (
              <div key={i} className="grid grid-cols-4 gap-4 py-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        </div>

        {/* 分页骨架 */}
        <div className="flex justify-center">
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
          </div>
        </div>
      </div>
    </div>
  );
}
