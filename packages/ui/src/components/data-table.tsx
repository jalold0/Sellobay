'use client';

import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type PaginationState,
  type Row,
  type RowSelectionState,
  type SortingState,
} from '@tanstack/react-table';
import { ChevronLeft, ChevronRight, ChevronsUpDown, Search } from 'lucide-react';
import * as React from 'react';

import { cn } from '../lib/cn';
import { Button } from './button';
import { Input } from './input';
import { Skeleton } from './skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './table';

export interface DataTableProps<TData> {
  columns: ColumnDef<TData, unknown>[];
  data: TData[];
  loading?: boolean;
  emptyState?: React.ReactNode;
  searchPlaceholder?: string;
  searchableKeys?: (keyof TData)[];
  pageSize?: number;
  rowSelection?: RowSelectionState;
  onRowSelectionChange?: (state: RowSelectionState) => void;
  onRowClick?: (row: TData) => void;
  toolbar?: React.ReactNode;
  className?: string;
}

export function DataTable<TData>({
  columns,
  data,
  loading,
  emptyState,
  searchPlaceholder = 'Qidirish...',
  searchableKeys,
  pageSize = 10,
  rowSelection,
  onRowSelectionChange,
  onRowClick,
  toolbar,
  className,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = React.useState('');
  const [pagination, setPagination] = React.useState<PaginationState>({ pageIndex: 0, pageSize });

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
      pagination,
      rowSelection: rowSelection ?? {},
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    onRowSelectionChange: (updater) => {
      if (!onRowSelectionChange) return;
      const next =
        typeof updater === 'function' ? updater(rowSelection ?? {}) : (updater as RowSelectionState);
      onRowSelectionChange(next);
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    enableRowSelection: Boolean(onRowSelectionChange),
    globalFilterFn: (row, _columnId, filterValue) => {
      const search = String(filterValue ?? '').toLowerCase();
      if (!search) return true;
      if (!searchableKeys || searchableKeys.length === 0) {
        return Object.values(row.original as Record<string, unknown>).some((v) =>
          String(v ?? '').toLowerCase().includes(search),
        );
      }
      return searchableKeys.some((k) =>
        String((row.original as Record<string, unknown>)[k as string] ?? '')
          .toLowerCase()
          .includes(search),
      );
    },
  });

  const rows = table.getRowModel().rows;
  const total = table.getFilteredRowModel().rows.length;
  const pageStart = pagination.pageIndex * pagination.pageSize + 1;
  const pageEnd = Math.min((pagination.pageIndex + 1) * pagination.pageSize, total);

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder={searchPlaceholder}
            className="pl-9"
          />
        </div>
        {toolbar}
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((h) => (
                  <TableHead
                    key={h.id}
                    onClick={h.column.getCanSort() ? h.column.getToggleSortingHandler() : undefined}
                    className={cn(h.column.getCanSort() && 'cursor-pointer select-none')}
                  >
                    {h.isPlaceholder ? null : (
                      <div className="inline-flex items-center gap-1">
                        {flexRender(h.column.columnDef.header, h.getContext())}
                        {h.column.getCanSort() ? (
                          <ChevronsUpDown className="h-3 w-3 opacity-50" />
                        ) : null}
                      </div>
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={`skel-${i}`}>
                  {columns.map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-32 text-center">
                  {emptyState ?? (
                    <span className="text-sm text-muted-foreground">Hech narsa topilmadi.</span>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row: Row<TData>) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() ? 'selected' : undefined}
                  onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                  className={cn(onRowClick && 'cursor-pointer')}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-xs text-muted-foreground">
          {total === 0
            ? '0 yozuv'
            : `${pageStart}–${pageEnd} / ${total} yozuv`}
          {onRowSelectionChange && Object.keys(rowSelection ?? {}).length > 0 ? (
            <span className="ml-2">
              ({Object.keys(rowSelection ?? {}).length} ta tanlangan)
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="ml-1 hidden sm:inline">Oldingi</span>
          </Button>
          <div className="px-2 text-sm">
            {pagination.pageIndex + 1} / {Math.max(table.getPageCount(), 1)}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <span className="mr-1 hidden sm:inline">Keyingi</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
