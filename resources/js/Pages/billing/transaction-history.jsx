import { DataTable } from "@/Components/table/data-table";
import { Card } from "@/Components/ui/card";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { capitalizeFirstLetter } from "@/Lib/Utils";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { debounce } from "lodash";
import { useEffect, useMemo, useState } from "react";

export default function TransactionHistory() {
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");

    const formatCurrency = (value) =>
        new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "PHP",
        }).format(value);

    const fetchTransactionHistory = async ({ queryKey }) => {
        const [_key, page, debouncedSearch] = queryKey;

        const { data } = await axios.get(
            "/api/billing/get/transaction-history",
            {
                params: {
                    page,
                    search: debouncedSearch,
                },
            },
        );

        return data;
    };

    const { data, isLoading } = useQuery({
        queryKey: ["transaction-histories", page, debouncedSearch],
        queryFn: fetchTransactionHistory,
    });

    const debouncedSetSearch = useMemo(
        () =>
            debounce((value) => {
                setDebouncedSearch(value);
            }, 1000),
        [],
    );

    const handleSearch = (value) => {
        setSearch(value);
        debouncedSetSearch(value);
    };

    useEffect(() => {
        return () => {
            debouncedSetSearch.cancel();
        };
    }, [debouncedSetSearch]);

    const loading = search !== debouncedSearch || isLoading;

    const columns = [
        {
            accessorKey: "or_number",
            header: "OR Number",
        },
        {
            accessorKey: "amount_paid",
            header: "Amount Paid",
            cell: ({ row }) => (
                <span className="text-green-600 font-semibold">
                    {formatCurrency(row.original.amount_paid)}
                </span>
            ),
        },
        {
            accessorKey: "created_at",
            header: "Date & Time",
        },
    ];

    return (
        <Card className="p-5">
            <DataTable
                columns={columns}
                data={data?.data ?? []}
                page={page}
                lastPage={data?.last_page ?? 1}
                setPage={setPage}
                search={search}
                setSearch={handleSearch}
                isLoading={loading}
                search_placeholder="transaction history"
            />
        </Card>
    );
}

TransactionHistory.layout = (page) => <AuthenticatedLayout children={page} />;
