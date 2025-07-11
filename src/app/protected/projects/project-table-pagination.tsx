"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { z } from "zod";
import Link from "next/link";

import { PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Button } from "@/components/ui/button";
import { searchSchema } from "./search-schema";

export function ProjectTablePagination({
  offset,
  limit,
  total,
}: z.infer<typeof searchSchema> & { total: number }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlSearchParams = new URLSearchParams(searchParams.toString());
  
  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil(total / limit);
  const hasPreviousPage = offset > 0;
  const hasNextPage = offset + limit < total;

  function getPageURL(page: number) {
    const newOffset = (page - 1) * limit;
    urlSearchParams.set("offset", String(newOffset));
    return pathname + "?" + urlSearchParams.toString();
  }

  function getPreviousPageURL() {
    return getPageURL(currentPage - 1);
  }

  function getNextPageURL() {
    return getPageURL(currentPage + 1);
  }

  // 生成页码按钮
  function generatePageNumbers() {
    const pages = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      // 如果总页数少于等于5页，显示所有页码
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // 如果总页数大于5页，显示当前页附近的页码
      let start = Math.max(1, currentPage - 2);
      const end = Math.min(totalPages, start + maxVisiblePages - 1);
      
      // 调整起始页，确保显示5个页码
      if (end - start + 1 < maxVisiblePages) {
        start = Math.max(1, end - maxVisiblePages + 1);
      }
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
    }
    
    return pages;
  }

  const pageNumbers = generatePageNumbers();

  return (
    <div className="flex items-center gap-2">
      {/* 分页信息 */}
      <div className="text-sm text-muted-foreground mr-4">
        第 {currentPage} 页，共 {totalPages} 页 ({total} 条记录)
      </div>
      
      {/* 上一页按钮 */}
      {hasPreviousPage && <PaginationPrevious href={getPreviousPageURL()} />}
      
      {/* 页码按钮 */}
      <div className="flex items-center gap-1">
        {pageNumbers.map((page) => (
          <Link key={page} href={getPageURL(page)}>
            <Button
              variant={page === currentPage ? "default" : "outline"}
              size="sm"
              className="w-8 h-8 p-0"
            >
              {page}
            </Button>
          </Link>
        ))}
      </div>
      
      {/* 下一页按钮 */}
      {hasNextPage && <PaginationNext href={getNextPageURL()} />}
    </div>
  );
}
