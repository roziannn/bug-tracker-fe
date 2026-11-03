import { Skeleton } from "@/components/ui/skeleton"
import { TableCell, TableRow } from "@/components/ui/table"

const WIDTHS = ["w-32", "w-44", "w-24", "w-16", "w-28", "w-20"]

// Baris placeholder untuk tabel yang datanya masih dimuat.
function TableSkeletonRows({ rows = 5, columns }: { rows?: number; columns: number }) {
  return (
    <>
      {Array.from({ length: rows }, (_, row) => (
        <TableRow key={row} aria-hidden="true">
          {Array.from({ length: columns }, (_, col) => (
            <TableCell key={col}>
              <Skeleton className={`h-4 ${WIDTHS[(row + col) % WIDTHS.length]} max-w-full`} />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  )
}

export { TableSkeletonRows }
