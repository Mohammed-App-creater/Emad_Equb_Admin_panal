

export function TableError() {
  return (
    <div className="flex h-48 w-full items-center justify-center rounded-md border border-red-300 bg-red-50 p-4">
      <div className="flex flex-col items-center gap-2 text-center">
        <p className="text-sm font-medium text-red-800">Failed to load data.</p>
        <p className="text-xs text-red-600">Please try refreshing the page.</p>
      </div>
    </div>
  );
}