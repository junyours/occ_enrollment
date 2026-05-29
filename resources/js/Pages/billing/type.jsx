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
import { Card } from "@/Components/ui/card";

export default function Type() {
    const queryClient = useQueryClient();
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState(null);

    const typeSchema = z.object({
        type_name: z.string().nonempty("The type name field is required."),
    });

    const typeForm = useForm({
        resolver: zodResolver(typeSchema),
        defaultValues: {
            type_name: "",
        },
    });

    const {
        handleSubmit,
        setValue,
        watch,
        clearErrors,
        setError,
        formState: { errors },
    } = typeForm;

    const handleOpen = (type) => {
        setOpen(!open);
        clearErrors();

        if (type) {
            setEditing(type);

            setValue("type_name", type.type_name);
        } else {
            setEditing(null);
            typeForm.reset();
        }
    };

    const addMutation = useMutation({
        mutationFn: async (data) => {
            const response = await axios.post("/api/billing/add/types", data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["types"] });
            handleOpen();
            typeForm.reset();
            toast.success("Type added successfully!");
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
                `/api/billing/update/types/${editing?.id}`,
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
            queryClient.invalidateQueries({ queryKey: ["types"] });
            handleOpen();
            setEditing(null);
            toast.success("Type updated successfully!");
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

        const { data } = await axios.get("/api/billing/get/types", {
            params: {
                page,
                search: debouncedSearch,
            },
        });

        return data;
    };

    const { data, isLoading } = useQuery({
        queryKey: ["types", page, debouncedSearch],
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
            accessorKey: "type_name",
            header: "Type",
        },
        {
            id: "actions",
            cell: ({ row }) => {
                const type = row.original;
                return (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleOpen(type)}>
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
                    search_placeholder="types"
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
                            {editing ? "Update Type" : "Add Type"}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-1">
                        <Label>Type</Label>
                        <Input
                            value={watch("type_name")}
                            onChange={(e) =>
                                setValue("type_name", e.target.value)
                            }
                        />
                        <InputError message={errors.type_name?.message} />
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

Type.layout = (page) => <AuthenticatedLayout children={page} />;
