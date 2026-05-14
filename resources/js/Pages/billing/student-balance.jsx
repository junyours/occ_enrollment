import { DataTable } from "@/Components/table/data-table";
import { Button } from "@/Components/ui/button";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { router } from "@inertiajs/react";
import { ArrowUpDown, Plus } from "lucide-react";

const columns = [
    {
        accessorKey: "id_number",
        header: "ID Number",
    },
    {
        accessorKey: "last_name",
        header: "Last Name",
    },
    {
        accessorKey: "first_name",
        header: "First Name",
    },
    {
        accessorKey: "middle_name",
        header: "Middle Name",
    },
    {
        accessorKey: "total_balance",
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() =>
                        column.toggleSorting(column.getIsSorted() === "asc")
                    }
                >
                    Total Balance
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            );
        },
        cell: ({ row }) => {
            const balance = parseFloat(row.getValue("total_balance"));
            const formatted = new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "PHP",
            }).format(balance);

            return <div className="text-right font-medium">{formatted}</div>;
        },
    },
];

export default function StudentBalance() {
    return (
        <DataTable
            columns={columns}
            data={[]}
            button={
                <Button
                    onClick={() =>
                        router.visit(route("billing.student-balances.add"))
                    }
                >
                    <Plus />
                    Add
                </Button>
            }
        />
    );
}

StudentBalance.layout = (page) => <AuthenticatedLayout children={page} />;
