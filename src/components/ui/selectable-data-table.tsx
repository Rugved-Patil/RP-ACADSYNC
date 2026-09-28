import React from "react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Trash2, CheckSquare } from "lucide-react";

interface SelectableDataTableProps<T> {
  data: T[];
  columns: {
    key: keyof T | string;
    title: string;
    render?: (item: T) => React.ReactNode;
  }[];
  selectedItems: T[];
  onSelectionChange: (items: T[]) => void;
  onBulkDelete?: (items: T[]) => void;
  onRowClick?: (item: T) => void;
  isLoading?: boolean;
  bulkActions?: React.ReactNode;
}

export function SelectableDataTable<T extends { id: string }>(props: SelectableDataTableProps<T>) {
  const { 
    data, 
    columns, 
    selectedItems,
    onSelectionChange,
    onBulkDelete,
    onRowClick,
    isLoading = false,
    bulkActions
  } = props;

  const isAllSelected = data.length > 0 && selectedItems.length === data.length;
  const isPartiallySelected = selectedItems.length > 0 && selectedItems.length < data.length;

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(data);
    } else {
      onSelectionChange([]);
    }
  };

  const handleSelectItem = (item: T, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedItems, item]);
    } else {
      onSelectionChange(selectedItems.filter(selected => selected.id !== item.id));
    }
  };

  const isItemSelected = (item: T) => {
    return selectedItems.some(selected => selected.id === item.id);
  };

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
    <div className="space-y-4">
      {/* Selection Summary and Bulk Actions */}
      {selectedItems.length > 0 && (
        <div className="bg-brand/10 border border-brand/20 rounded-md p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckSquare className="h-4 w-4 text-brand" />
              <span className="text-sm font-medium text-foreground">
                {selectedItems.length} item{selectedItems.length > 1 ? 's' : ''} selected
              </span>
            </div>
            <div className="flex items-center gap-2">
              {bulkActions}
              {onBulkDelete && (
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => onBulkDelete(selectedItems)}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete Selected
                </Button>
              )}
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => onSelectionChange([])}
              >
                Clear Selection
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Data Table */}
      <div className="w-full overflow-auto bg-card rounded-md shadow">
        <table className="w-full">
          <thead>
            <tr className="bg-muted/50 border-b border-border">
              <th className="px-6 py-3 text-left">
                <Checkbox
                  checked={isAllSelected || isPartiallySelected}
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all items"
                />
                {isPartiallySelected && (
                  <span className="ml-1 text-xs text-brand">
                    ({selectedItems.length})
                  </span>
                )}
              </th>
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
            {data.map((item) => {
              const isSelected = isItemSelected(item);
              return (
                <tr
                  key={item.id}
                  className={cn(
                    "hover:bg-muted/50 transition-colors",
                    isSelected && "bg-brand/10 hover:bg-brand/20",
                    onRowClick && "cursor-pointer"
                  )}
                  onClick={(e) => {
                    // Don't trigger row click if clicking on checkbox
                    if ((e.target as HTMLElement).closest('[role="checkbox"]')) {
                      return;
                    }
                    onRowClick && onRowClick(item);
                  }}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(checked) => handleSelectItem(item, checked as boolean)}
                      aria-label={`Select item ${item.id}`}
                    />
                  </td>
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
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}