import { DataTable } from "@/Components/table/data-table";
import { Button } from "@/Components/ui/button";
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
} from "@/Components/ui/dialog";
import { Label } from "@/Components/ui/label";
import { Input } from "@/Components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { toast } from "sonner";
import InputError from "@/Components/InputError";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/Components/ui/dropdown-menu";

export default function SchoolYear() {
    const queryClient = useQueryClient();
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState(null);

    const schoolYearSchema = z.object({
        school_year: z.string().nonempty("The school year field is required."),
    });

    const schoolYearForm = useForm({
        resolver: zodResolver(schoolYearSchema),
        defaultValues: {
            school_year: "",
        },
    });

    const {
        handleSubmit,
        setValue,
        watch,
        clearErrors,
        setError,
        formState: { errors },
    } = schoolYearForm;

    const handleOpen = (school_year) => {
        setOpen(!open);
        clearErrors();

        if (school_year) {
            setEditing(school_year);

            setValue("school_year", school_year.school_year);
        } else {
            setEditing(null);
            schoolYearForm.reset();
        }
    };

    const addMutation = useMutation({
        mutationFn: async (data) => {
            const response = await axios.post(
                "/api/billing/add/school-year",
                data,
            );
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["school-years"] });
            handleOpen();
            schoolYearForm.reset();
            toast.success("School year added successfully!");
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
                `/api/billing/update/school-year/${editing?.id}`,
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
            queryClient.invalidateQueries({ queryKey: ["school-years"] });
            handleOpen();
            setEditing(null);
            toast.success("School year updated successfully!");
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

        const { data } = await axios.get("/api/billing/get-school-year", {
            params: {
                page,
                search: debouncedSearch,
            },
        });

        return data;
    };

    const { data, isLoading } = useQuery({
        queryKey: ["school-years", page, debouncedSearch],
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

    const isTyping = search !== debouncedSearch;

    const loading = isTyping || isLoading;

    const columns = [
        {
            accessorKey: "school_year",
            header: "School Year",
        },
        {
            id: "actions",
            cell: ({ row }) => {
                const school_year = row.original;
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
                                onClick={() => handleOpen(school_year)}
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
            <DataTable
                columns={columns}
                data={data?.data ?? []}
                page={page}
                lastPage={data?.last_page ?? 1}
                setPage={setPage}
                search={search}
                setSearch={handleSearch}
                isLoading={loading}
                button={
                    <Button onClick={() => setOpen(true)}>
                        <Plus />
                        Add
                    </Button>
                }
            />

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
                        <DialogTitle>Add School Year</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-1">
                        <Label>School Year</Label>
                        <Input
                            value={watch("school_year")}
                            onChange={(e) =>
                                setValue("school_year", e.target.value)
                            }
                        />
                        <InputError message={errors.school_year?.message} />
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

SchoolYear.layout = (page) => <AuthenticatedLayout children={page} />;
