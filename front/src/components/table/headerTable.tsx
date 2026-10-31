import {
  type Column,
  flexRender,
  type Header,
  type RowData,
  type Table,
} from '@tanstack/react-table'
import { ChevronDown, ChevronsUpDown, ChevronUp } from 'lucide-react'
import type React from 'react'

import { cn } from '../../libs/utils.ts'
import type { Features } from './features.ts'

type HeaderTableProps<TData extends RowData> = {
  table: Table<Features, TData>
  getCommonPinningStyles: (
    column: Column<Features, TData, unknown>,
  ) => React.CSSProperties
  fixedLayout?: boolean
}

const sortIcons = {
  asc: ChevronUp,
  desc: ChevronDown,
}

function SortIcon({ sortState }: { sortState: false | 'asc' | 'desc' }) {
  const Icon = sortState ? sortIcons[sortState] : ChevronsUpDown
  return <Icon className="w-3 h-3 text-text-light shrink-0" />
}

export function HeaderTable<TData extends RowData>({
  table,
  getCommonPinningStyles,
  fixedLayout,
}: HeaderTableProps<TData>) {
  return (
    <thead className="sticky top-0 z-10 bg-card">
      {table.getHeaderGroups().map((headerGroup) => (
        <tr key={headerGroup.id}>
          {headerGroup.headers.map((header) => (
            <HeaderCell
              key={header.id}
              header={header}
              getCommonPinningStyles={getCommonPinningStyles}
              fixedLayout={fixedLayout}
            />
          ))}
        </tr>
      ))}
    </thead>
  )
}

function HeaderCell<TData extends RowData>({
  header,
  getCommonPinningStyles,
  fixedLayout,
}: Omit<HeaderTableProps<TData>, 'table'> & {
  header: Header<Features, TData, unknown>
}) {
  const { column } = header
  const meta = header.column.columnDef.meta
  const headerClass = meta?.headerClass ?? ''
  const grow = meta?.grow
  const align = meta?.align ?? 'left'

  const pinningStyles = getCommonPinningStyles(column)
  // Override sticky bg to match thead background
  const maxSize = column.columnDef.maxSize
  const thStyle: React.CSSProperties = {
    ...pinningStyles,
    minWidth: header.getSize(),
    maxWidth: maxSize ? maxSize : undefined,
    // `table-fixed` ne regarde que `width` : sans elle, les colonnes
    // se partageraient la largeur a parts egales.
    width: grow ? '100%' : fixedLayout ? header.getSize() : undefined,
    ...(pinningStyles.backgroundColor
      ? { backgroundColor: 'var(--color-card)' }
      : {}),
  }

  return (
    <th
      colSpan={header.colSpan}
      style={thStyle}
      className="h-10 border-b border-border-dark bg-card"
    >
      {header.isPlaceholder ? null : (
        <button
          type="button"
          onClick={column.getToggleSortingHandler()}
          className={cn(
            'w-full flex items-center gap-3 px-4 py-2 text-xs text-text-light font-medium transition-colors',
            align === 'right' && 'justify-end',
            align === 'center' && 'justify-center',
            column.getCanSort() && 'cursor-pointer hover:text-text',
          )}
        >
          <span className={cn('title-column truncate', headerClass)}>
            {flexRender(column.columnDef.header, header.getContext())}
          </span>
          {column.getCanSort() && <SortIcon sortState={column.getIsSorted()} />}
        </button>
      )}
    </th>
  )
}
