import { Button } from "@/Components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/Components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/Components/ui/table";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { router, usePage } from "@inertiajs/react";
import { useQuery } from "@tanstack/react-query";
import { Check, Circle, Edit, Plus } from "lucide-react";
import { useState } from "react";
import AddUpdateFacultyDialog from "./AddUpdateFacultyDialog";
import { formatFullName } from "@/Lib/Utils";
import SearchBar from "@/Components/ui/SearchBar";
import axios from "axios";
import { Skeleton } from "@/Components/ui/skeleton";
import PaginationPages from "@/Components/ui/PaginationPages";
import { toast } from "sonner";

export default function Index({ search = "" }) {
    const { url } = usePage();
    const page = new URLSearchParams(url.split("?")[1] || "").get("page") || "1";
    const [open, setOpen] = useState(false);
    const [selectedFacultyId, setSelectedFacultyId] = useState(null);
    const [togglingId, setTogglingId] = useState(null);
    const { data, isLoading, refetch, isError } = useQuery({
        queryKey: ["nstp-faculty", search, page],
        queryFn: async ({ signal }) => {
            const response = await axios.post(
                route("nstp-director.faculty-data"),
                { search, page },
                { signal },
            );
            return response.data;
        },
        staleTime: 60_000,
    });
    const faculty = data?.data ?? [];

    const handleSearch = (value) => {
        router.get(route("nstp-director.nstp-faculties"), {
            search: value,
        }, { preserveState: true, replace: true });
    };

    const handleOpenChange = (nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) setSelectedFacultyId(null);
    };

    const activeOnChange = async (id, value) => {
        if (togglingId !== null) return;
        setTogglingId(id);
        try {
            const response = await axios.post(route("nstp-director.toggle-faculty-active"), { id, value });
            toast.success(response.data.success);
            await refetch();
        } catch (error) {
            toast.error(error.response?.data?.message || "Unable to update faculty status.");
        } finally {
            setTogglingId(null);
        }
    };

    return (
        <Card className="pt-6">
            <CardContent className="space-y-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                            setSelectedFacultyId(null);
                            setOpen(true);
                        }}
                    >
                        <Plus size={16} /> Add Faculty
                    </Button>
                    <SearchBar className="w-full sm:max-w-sm" onSearch={handleSearch} />
                </div>
                <div className="overflow-x-auto rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>ID Number</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead className="text-center">Active</TableHead>
                                <TableHead><span className="sr-only">Actions</span></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                Array.from({ length: 5 }, (_, index) => (
                                    <TableRow key={index}>
                                        {Array.from({ length: 5 }, (_, column) => (
                                            <TableCell key={column}><Skeleton className="h-7 w-24" /></TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            ) : isError ? (
                                <TableRow>
                                    <TableCell colSpan={5}>
                                        <div role="alert" className="flex items-center justify-center gap-3 py-4">
                                            <p className="text-sm text-destructive">Unable to load faculty.</p>
                                            <Button type="button" variant="outline" onClick={() => refetch()}>Retry</Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : faculty.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                                        No faculty found.
                                    </TableCell>
                                </TableRow>
                            ) : faculty.map((member) => {
                                const active = Number(member.active) === 1;
                                return (
                                    <TableRow key={member.id}>
                                        <TableCell className="whitespace-nowrap">{member.user_id_no}</TableCell>
                                        <TableCell>{formatFullName(member)}</TableCell>
                                        <TableCell>{member.email}</TableCell>
                                        <TableCell className="text-center">
                                            <button
                                                type="button"
                                                aria-label={`Toggle active status for ${formatFullName(member)}`}
                                                aria-pressed={active}
                                                disabled={togglingId !== null}
                                                onClick={() => activeOnChange(member.id, active ? 0 : 1)}
                                                className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium disabled:opacity-50"
                                            >
                                                {active ? <Check size={14} className="text-green-600" /> : <Circle size={14} />}
                                                {togglingId === member.id ? "Saving..." : active ? "Active" : "Inactive"}
                                            </button>
                                        </TableCell>
                                        <TableCell>
                                            <Button
                                                type="button"
                                                size="icon"
                                                variant="ghost"
                                                aria-label={`Edit ${formatFullName(member)}`}
                                                onClick={() => {
                                                    setSelectedFacultyId(member.id);
                                                    setOpen(true);
                                                }}
                                            >
                                                <Edit size={16} />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
            {data && (
                <CardFooter><PaginationPages data={data} /></CardFooter>
            )}
            {open && (
                <AddUpdateFacultyDialog
                    open={open}
                    setOpen={handleOpenChange}
                    facultyId={selectedFacultyId}
                    refetch={refetch}
                />
            )}
        </Card>
    );
}

Index.layout = (page) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;
