import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { apiFetch } from "@/lib/api";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { Ticket } from "@/types/tickets";
import { TicketStatus, TicketCategory } from "@helpdesk/shared";

const statusVariant: Record<string, "default" | "secondary" | "outline"> = {
  [TicketStatus.open]: "default",
  [TicketStatus.resolved]: "secondary",
  [TicketStatus.closed]: "outline",
};

const categoryLabel: Record<string, string> = {
  [TicketCategory.general_question]: "General",
  [TicketCategory.technical_question]: "Technical",
  [TicketCategory.refund_request]: "Refund",
};

const columnHelper = createColumnHelper<Ticket>();

const columns = [
  columnHelper.accessor("id", {
    header: "ID",
    cell: (info) => (
      <span className="text-muted-foreground">#{info.getValue()}</span>
    ),
  }),
  columnHelper.accessor("subject", {
    header: "Subject",
    cell: (info) => <span className="font-medium">{info.getValue()}</span>,
  }),
  columnHelper.accessor("fromName", {
    header: "From",
    cell: (info) => (
      <div>
        <div className="text-sm">{info.getValue()}</div>
        <div className="text-xs text-muted-foreground">
          {info.row.original.fromEmail}
        </div>
      </div>
    ),
  }),
  columnHelper.accessor("status", {
    header: "Status",
    cell: (info) => (
      <Badge variant={statusVariant[info.getValue()]}>{info.getValue()}</Badge>
    ),
  }),
  columnHelper.accessor("category", {
    header: "Category",
    cell: (info) =>
      info.getValue() ? (
        <Badge variant="outline">{categoryLabel[info.getValue()!]}</Badge>
      ) : (
        <span className="text-xs text-muted-foreground">—</span>
      ),
  }),
  columnHelper.accessor("createdAt", {
    header: "Received",
    cell: (info) => (
      <span className="text-sm">
        {new Date(info.getValue()).toLocaleDateString()}
      </span>
    ),
  }),
];

function SortIcon({ sorted }: { sorted: false | "asc" | "desc" }) {
  if (sorted === "asc") return <ArrowUp className="size-3.5" />;
  if (sorted === "desc") return <ArrowDown className="size-3.5" />;
  return <ArrowUpDown className="size-3.5 text-muted-foreground" />;
}

export function TicketsPage() {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "createdAt", desc: true },
  ]);

  const sortBy = sorting[0]?.id ?? "createdAt";
  const sortOrder = sorting[0]?.desc !== false ? "desc" : "asc";

  const { data: tickets, isPending, error } = useQuery({
    queryKey: ["tickets", sortBy, sortOrder],
    queryFn: () =>
      apiFetch<Ticket[]>(`/api/tickets?sortBy=${sortBy}&sortOrder=${sortOrder}`),
  });

  const table = useReactTable({
    data: tickets ?? [],
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
  });

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Tickets</h1>
        <p className="text-sm text-muted-foreground">
          Incoming support requests
        </p>
      </div>

      {error && <p className="text-sm text-destructive">{error.message}</p>}

      {isPending ? (
        <Table data-testid="tickets-loading">
          <TableHeader>
            <TableRow>
              {columns.map((col, i) => (
                <TableHead key={i}>
                  {"accessorKey" in col
                    ? String(col.accessorKey)
                    : typeof col.header === "string"
                      ? col.header
                      : ""}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell>
                  <Skeleton className="h-4 w-8" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-48" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-36" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-16 rounded-full" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-20 rounded-full" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-24" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        tickets && (
          <Table data-testid="tickets-table">
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder ? null : (
                        <button
                          onClick={header.column.getToggleSortingHandler()}
                          className="flex items-center gap-1.5 cursor-pointer select-none"
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                          <SortIcon sorted={header.column.getIsSorted()} />
                        </button>
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="text-center text-muted-foreground py-8"
                  >
                    No tickets yet
                  </TableCell>
                </TableRow>
              )}
              {table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )
      )}
    </div>
  );
}
