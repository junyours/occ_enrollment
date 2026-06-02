import {
    flexRender,
    getCoreRowModel,
    useReactTable,
} from "@tanstack/react-table";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/Components/ui/table";
import { Button } from "@/Components/ui/button";
import { Input } from "@/Components/ui/input";
import { MoveLeft, MoveRight } from "lucide-react";
import { cn } from "@/Lib/Utils";

export function DataTable({
    columns,
    data,
    button,
    page,
    lastPage,
    setPage,
    search,
    setSearch,
    isLoading,
    selected,
    setSelected,
    search_placeholder,
}) {
    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
    });

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
                <Input
                    placeholder={`Search for ${search_placeholder}`}
                    value={search}
                    onChange={(e) => {
                        setSearch(e.target.value);
                        setPage(1);
                    }}
                    className="max-w-sm"
                />

                {button}
            </div>

            <Table>
                <TableHeader>
                    {table.getHeaderGroups().map((headerGroup) => (
                        <TableRow key={headerGroup.id}>
                            {headerGroup.headers.map((header) => (
                                <TableHead
                                    key={header.id}
                                    className="whitespace-nowrap"
                                >
                                    {header.isPlaceholder
                                        ? null
                                        : flexRender(
                                              header.column.columnDef.header,
                                              header.getContext(),
                                          )}
                                </TableHead>
                            ))}
                        </TableRow>
                    ))}
                </TableHeader>

                <TableBody>
                    {table.getRowModel().rows?.length ? (
                        table.getRowModel().rows.map((row) => (
                            <TableRow
                                key={row.id}
                                data-state={row.getIsSelected() && "selected"}
                                className={cn(setSelected ? 'cursor-pointer' : 'cursor-default',
                                    selected === row.original.id &&
                                        "bg-secondary",
                                )}
                                onClick={() => setSelected(row.original)}
                            >
                                {row.getVisibleCells().map((cell) => (
                                    <TableCell
                                        key={cell.id}
                                        className={cn(
                                            "whitespace-nowrap",
                                            selected === row.original.id &&
                                                "text-primary",
                                        )}
                                    >
                                        {flexRender(
                                            cell.column.columnDef.cell,
                                            cell.getContext(),
                                        )}
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell
                                colSpan={columns.length}
                                className="h-24 text-center"
                            >
                                {isLoading
                                    ? "Loading..."
                                    : search
                                      ? `No result for "${search}"`
                                      : `Search for ${search_placeholder}`}
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>

            <div className="flex items-center justify-end space-x-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                >
                    <MoveLeft className="mr-1 h-4 w-4" />
                    Previous
                </Button>

                <span className="text-xs font-medium">
                    Page {page} of {lastPage}
                </span>

                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page + 1)}
                    disabled={page === lastPage}
                >
                    Next
                    <MoveRight className="ml-1 h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}
