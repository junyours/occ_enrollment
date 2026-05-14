import { DataTable } from "@/Components/table/data-table";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import { debounce } from "lodash";
import { Button } from "@/Components/ui/button";
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/Components/ui/label";
import { Input } from "@/Components/ui/input";

export default function AddStudentBalance() {
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [selectedStudent, setSelectedStudent] = useState(null);

    const fetchStudent = async ({ queryKey }) => {
        const [_key, page, debouncedSearch] = queryKey;

        const { data } = await axios.get("/api/billing/get-student", {
            params: {
                page,
                search: debouncedSearch,
            },
        });

        return data;
    };

    const { data, isLoading } = useQuery({
        queryKey: ["students", page, debouncedSearch],
        queryFn: fetchStudent,
        enabled: !!debouncedSearch,
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

    const isTyping = search !== debouncedSearch;

    const loading = isTyping || isLoading;

    const columns = [
        {
            accessorKey: "user_id_no",
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
            id: "action",
            header: "Action",
            cell: ({ row }) => (
                <Button
                    size="sm"
                    onClick={() => setSelectedStudent(row.original)}
                    variant={
                        selectedStudent?.id === row.original.id
                            ? "default"
                            : "secondary"
                    }
                >
                    {selectedStudent?.id === row.original.id
                        ? "Selected"
                        : "Select"}
                </Button>
            ),
        },
    ];

    return (
        <div className="space-y-6">
            <div className="rounded-xl border bg-background p-5 shadow-sm">
                <h1 className="text-xl font-semibold">Add Student Balance</h1>
                <p className="mt-1 text-sm text-secondary-foreground">
                    Search and select a student to add balances.
                </p>
            </div>
            <div className="flex gap-6">
                <div className="flex-1 rounded-xl border bg-background p-5 shadow-sm">
                    <DataTable
                        columns={columns}
                        data={data?.data ?? []}
                        page={page}
                        lastPage={data?.last_page ?? 1}
                        setPage={setPage}
                        search={search}
                        setSearch={handleSearch}
                        isLoading={loading}
                        selected={selectedStudent?.id}
                    />
                </div>
                {selectedStudent && (
                    <div className="flex-1 rounded-xl border bg-background p-6 shadow-sm h-fit">
                        <div className="space-y-6">
                            <div className="flex justify-between items-center">
                                <h2 className="text-lg font-semibold">
                                    Selected Student
                                </h2>
                                <Button size="sm" variant="ghost">
                                    Close
                                </Button>
                            </div>
                            <div className="mt-3 rounded-lg bg-secondary p-4">
                                <p className="font-medium">
                                    {selectedStudent.last_name},{" "}
                                    {selectedStudent.first_name}
                                </p>
                                <p className="text-sm">
                                    {selectedStudent.user_id_no}
                                </p>
                            </div>
                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <Label>School Year</Label>
                                    <Select>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectGroup>
                                                <SelectItem value="light">
                                                    Light
                                                </SelectItem>
                                                <SelectItem value="dark">
                                                    Dark
                                                </SelectItem>
                                                <SelectItem value="system">
                                                    System
                                                </SelectItem>
                                            </SelectGroup>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1">
                                    <Label>Semester</Label>
                                    <Select>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectGroup>
                                                <SelectItem value="light">
                                                    Light
                                                </SelectItem>
                                                <SelectItem value="dark">
                                                    Dark
                                                </SelectItem>
                                                <SelectItem value="system">
                                                    System
                                                </SelectItem>
                                            </SelectGroup>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1">
                                    <Label>Balance</Label>
                                    <Input/>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

AddStudentBalance.layout = (page) => <AuthenticatedLayout children={page} />;
