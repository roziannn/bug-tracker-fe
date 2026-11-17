"use client"

import {
  Pagination,
  PaginationContent,
  PaginationFirst,
  PaginationEllipsis,
  PaginationItem,
  PaginationLast,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"

type TablePaginationProps = {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  className?: string
}

export function TablePagination({
  currentPage,
  totalPages,
  onPageChange,
  className,
}: TablePaginationProps) {
  const pages = totalPages <= 7
    ? Array.from({ length: totalPages }, (_, index) => index + 1)
    : currentPage <= 4
      ? [1, 2, 3, 4, 5, "end", totalPages] as const
      : currentPage >= totalPages - 3
        ? [1, "start", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages] as const
        : [1, "start", currentPage - 1, currentPage, currentPage + 1, "end", totalPages] as const

  return (
    <Pagination className={className ?? "mx-0 w-auto justify-end"}>
      <PaginationContent>
        <PaginationItem>
          <PaginationFirst
            disabled={currentPage === 1}
            onClick={() => onPageChange(1)}
          />
        </PaginationItem>
        <PaginationItem>
          <PaginationPrevious
            disabled={currentPage === 1}
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          />
        </PaginationItem>
        {pages.map((page) => page === "start" || page === "end" ? (
          <PaginationItem key={page}>
            <PaginationEllipsis />
          </PaginationItem>
        ) : (
          <PaginationItem key={page}>
            <PaginationLink
              isActive={currentPage === page}
              onClick={() => onPageChange(page)}
            >
              {page}
            </PaginationLink>
          </PaginationItem>
        ))}
        <PaginationItem>
          <PaginationNext
            disabled={currentPage === totalPages}
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          />
        </PaginationItem>
        <PaginationItem>
          <PaginationLast
            disabled={currentPage === totalPages}
            onClick={() => onPageChange(totalPages)}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  )
}
