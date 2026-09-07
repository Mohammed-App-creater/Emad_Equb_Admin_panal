import React from "react";
import {
  Table,
  THead,
  TBody,
  TR,
  TH,
  TD,
} from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import { TableLoading } from "./table-loading";
import { TableEmpty } from "./table-empty";

type Column<T> = {
  key: keyof T;
  label: string;
  render?: (row: T) => React.ReactNode;
};

type DataTableProps<T> = {
  columns: Column<T>[];
  data: T[];
  loading: boolean;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  loading,
  page,
  totalPages,
  onPageChange,
}: DataTableProps<T>) {
  if (loading) return <TableLoading />;
  if (!data.length) return <TableEmpty />;

  return (
    <>
      <Table>
        <THead>
          <TR>
            {columns.map((col) => (
              <TH key={String(col.key)}>{col.label}</TH>
            ))}
          </TR>
        </THead>

        <TBody>
          {data.map((row, i) => (
            <TR key={i}>
              {columns.map((col) => (
                <TD key={String(col.key)}>
                  {col.render ? col.render(row) : String(row[col.key])}
                </TD>
              ))}
            </TR>
          ))}
        </TBody>
      </Table>

      <Pagination
        page={page}
        totalPages={totalPages}
        onPageChange={onPageChange}
      />
    </>
  );
}
