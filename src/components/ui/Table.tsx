import React, { useRef } from 'react';
import { Search } from 'lucide-react';
import { EmptyState } from './EmptyState';

interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  className?: string;
}

interface TableProps<T> {
  label: string;
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T) => string;
  searchTerm?: string;
  onSearchChange?: (val: string) => void;
  searchPlaceholder?: string;
  emptyMessage?: string;
  actions?: React.ReactNode;
}

export function Table<T>({
  label, data, columns, keyExtractor, searchTerm, onSearchChange,
  searchPlaceholder = 'Search records…', emptyMessage = 'No records found.', actions,
}: TableProps<T>) {
  const searchRef = useRef<HTMLInputElement>(null);
  const hasSearch = Boolean(searchTerm?.trim());
  const clearSearch = () => {
    onSearchChange?.('');
    searchRef.current?.focus();
  };

  return (
    <div className="portal-panel">
      {(onSearchChange || actions) && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4">
          {onSearchChange && (
            <div className="relative w-full max-w-sm">
              <Search aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
              <input
                ref={searchRef}
                type="search"
                value={searchTerm ?? ''}
                onChange={event => onSearchChange(event.target.value)}
                aria-label={searchPlaceholder}
                placeholder={searchPlaceholder}
                className="portal-field pl-10 pr-3.5"
              />
            </div>
          )}
          {actions && <div className="flex min-w-0 flex-wrap items-center gap-2.5">{actions}</div>}
        </div>
      )}

      <div role="region" aria-label={label} tabIndex={0} className="overflow-x-auto rounded-lg focus-visible:outline-offset-[-2px]">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">{label}</caption>
          <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700">
            <tr>
              {columns.map(column => (
                <th key={column.key} scope="col" className={`px-4 py-3 sm:px-5 ${column.className ?? ''}`}>
                  {column.header || <span className="sr-only">Actions</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="p-4 sm:p-6">
                  <EmptyState
                    title={hasSearch ? 'No matching records' : 'No records available'}
                    description={hasSearch ? 'Change or clear your search to see more records.' : emptyMessage}
                    action={hasSearch && onSearchChange ? { label: 'Clear search', onClick: clearSearch } : undefined}
                    className="border-0"
                  />
                </td>
              </tr>
            ) : (
              data.map(item => (
                <tr key={keyExtractor(item)} className="transition-colors hover:bg-slate-50 focus-within:bg-slate-50">
                  {columns.map(column => (
                    <td key={column.key} className={`px-4 py-3 text-slate-700 sm:px-5 ${column.className ?? ''}`}>
                      {column.render ? column.render(item) : (item as Record<string, React.ReactNode>)[column.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="border-t border-slate-200 px-4 py-3 text-xs font-medium text-slate-600 sm:px-5">
        {data.length} {data.length === 1 ? 'record' : 'records'} shown
      </div>
    </div>
  );
}
