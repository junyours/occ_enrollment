import { DataTable } from "@/components/table/data-table";
import { Button } from "@/components/ui/button";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { debounce } from "lodash";
import { Loader2, MoreHorizontal, Plus, SquarePen } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { toast } from "sonner";
import InputError from "@/components/InputError";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card } from "@/components/ui/card";

export default function Semester() {
    const queryClient = useQueryClient();
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState(null);

    const semesterSchema = z.object({
        semester_name: z
            .string()
            .nonempty("The semester name field is required."),
    });

    const semesterForm = useForm({
        resolver: zodResolver(semesterSchema),
        defaultValues: {
            semester_name: "",
        },
    });

    const {
        handleSubmit,
        setValue,
        watch,
        clearErrors,
        setError,
        formState: { errors },
    } = semesterForm;

    const handleOpen = (semester) => {
        setOpen(!open);
        clearErrors();

        if (semester) {
            setEditing(semester);

            setValue("semester_name", semester.semester_name);
        } else {
            setEditing(null);
            semesterForm.reset();
        }
    };

    const addMutation = useMutation({
        mutationFn: async (data) => {
            const response = await axios.post(
                "/api/billing/add/semesters",
                data,
            );
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["semesters"] });
            handleOpen();
            semesterForm.reset();
            toast.success("Semester added successfully!");
        },
        onError: (error) => {
            const errors = error.response.data.errors;
            if (errors) {
                Object.keys(errors).forEach((field) => {
                    setError(field, {
                        type: "server",
                        message: errors[field][0],
                    });
                });
            }
        },
    });

    const updateMutation = useMutation({
        mutationFn: async (data) => {
            const response = await axios.post(
                `/api/billing/update/semesters/${editing?.id}`,
                data,
                {
                    headers: {
                        "Content-Type": "multipart/form-data",
                    },
                },
            );
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["semesters"] });
            handleOpen();
            setEditing(null);
            toast.success("Semester updated successfully!");
        },
        onError: (error) => {
            const errors = error.response.data.errors;
            if (errors) {
                Object.keys(errors).forEach((field) => {
                    setError(field, {
                        type: "server",
                        message: errors[field][0],
                    });
                });
            }
        },
    });

    const processing = addMutation.isPending || updateMutation.isPending;

    const onSubmit = (data) => {
        if (editing) {
            updateMutation.mutate(data);
        } else {
            addMutation.mutate(data);
        }
    };

    const fetchSchoolYear = async ({ queryKey }) => {
        const [_key, page, debouncedSearch] = queryKey;

        const { data } = await axios.get("/api/billing/get/semesters", {
            params: {
                page,
                search: debouncedSearch,
            },
        });

        return data;
    };

    const { data, isLoading } = useQuery({
        queryKey: ["semesters", page, debouncedSearch],
        queryFn: fetchSchoolYear,
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
            accessorKey: "semester_name",
            header: "Semester",
        },
        {
            id: "actions",
            cell: ({ row }) => {
                const semester = row.original;
                return (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem
                                onClick={() => handleOpen(semester)}
                            >
                                <SquarePen />
                                Edit
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                );
            },
        },
    ];

    return (
        <>
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
                    search_placeholder="semesters"
                    button={
                        <Button onClick={() => setOpen(true)}>
                            <Plus />
                            Add
                        </Button>
                    }
                />
            </Card>

            <Dialog
                open={open}
                onOpenChange={() => {
                    if (!processing) {
                        handleOpen();
                    }
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {editing ? "Update Semester" : "Add Semester"}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-1">
                        <Label>Semester</Label>
                        <Input
                            value={watch("semester_name")}
                            onChange={(e) =>
                                setValue("semester_name", e.target.value)
                            }
                        />
                        <InputError message={errors.semester_name?.message} />
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="ghost">Close</Button>
                        </DialogClose>
                        <Button
                            onClick={handleSubmit(onSubmit)}
                            disabled={processing}
                        >
                            {processing && <Loader2 className="animate-spin" />}
                            {processing
                                ? editing
                                    ? "Updating..."
                                    : "Saving..."
                                : editing
                                  ? "Update"
                                  : "Save"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

Semester.layout = (page) => <AuthenticatedLayout children={page} />;
