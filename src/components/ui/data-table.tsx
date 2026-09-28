
import React from "react";
import { cn } from "@/lib/utils";

interface DataTableProps<T> {
  data: T[];
  columns: {
    key: keyof T | string;
    title: string;
    render?: (item: T) => React.ReactNode;
  }[];
  onRowClick?: (item: T) => void;
  isLoading?: boolean;
}

export function DataTable<T extends { id: string }>(props: DataTableProps<T>) {
  const { data, columns, onRowClick, isLoading = false } = props;

  if (isLoading) {
    return (
      <div className="w-full overflow-auto bg-card rounded-md shadow">
        <div className="p-4 flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand"></div>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="w-full overflow-auto bg-card rounded-md shadow">
        <div className="p-4 text-center text-muted-foreground">No data available</div>
      </div>
    );
  }

  return (
    <div className="w-full overflow-auto bg-card rounded-md shadow">
      <table className="w-full">
        <thead>
          <tr className="bg-muted/50 border-b border-border">
            {columns.map((column) => (
              <th
                key={column.key.toString()}
                className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider"
              >
                {column.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {data.map((item) => (
            <tr
              key={item.id}
              className={cn(
                "hover:bg-muted/50 transition-colors",
                onRowClick && "cursor-pointer"
              )}
              onClick={() => onRowClick && onRowClick(item)}
            >
              {columns.map((column) => (
                <td
                  key={`${item.id}-${column.key.toString()}`}
                  className="px-6 py-4 whitespace-nowrap text-sm text-foreground"
                >
                  {column.render
                    ? column.render(item)
                    : item[column.key as keyof T] as React.ReactNode}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
