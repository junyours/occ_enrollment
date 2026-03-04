import PreLoader from "@/Components/preloader/PreLoader";
import { Card, CardContent, CardHeader, CardTitle } from "@/Components/ui/card";
import { Head, useForm, usePage } from "@inertiajs/react";
import React, { useEffect, useState } from "react";
import { PageTitle } from "@/Components/ui/PageTitle";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Button } from "@/Components/ui/button";
import DataTable from "@/Components/ui/dTable";
import ConfirmDialog from "@/Components/ui/ConfirmDialog";

const FeedbackCategories = () => {

    const { categories } = usePage().props;

    const [loading, setLoading] = useState(true);
    const [pageIndex, setPageIndex] = useState(0);

    const [open, setOpen] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [selectedId, setSelectedId] = useState(null);

    const [editMode, setEditMode] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState(null);

    const form = useForm({
        name: "",
        description: "",
        recommendation: "",
    });

    useEffect(() => {
        setLoading(false);
    }, [categories]);

    /* ---------------- OPEN MODAL ---------------- */

    const openAdd = () => {
        setEditMode(false);
        setSelectedCategory(null);
        form.reset();
        setOpen(true);
    };

    const openEdit = (data) => {
        setEditMode(true);
        setSelectedCategory(data);

        form.setData({
            name: data.name,
            description: data.description ?? "",
            recommendation: data.recommendation ?? "",
        });

        setOpen(true);
    };

    /* ---------------- CLOSE MODAL ------------*/

    const closeModal = () => {
    setOpen(false);
    setEditMode(false);
    setSelectedCategory(null);
    form.reset();
    form.clearErrors();
};

    /* ---------------- SUBMIT ---------------- */

    const submit = (e) => {
        e.preventDefault();

        if (editMode) {
            form.put(`/Guidance/feedback-categories/${selectedCategory.id}`, {
                onSuccess: () => closeModal(),
            });
        } else {
            form.post("/Guidance/feedback-categories", {
                onSuccess: () => {
                    closeModal();
                },
            });
        }
    };

    /* ---------------- DELETE ---------------- */

    const openConfirmDialog = (id) => {
        setSelectedId(id);
        setConfirmOpen(true);
    };

    const handleConfirmDelete = () => {
        form.delete(`/Guidance/feedback-categories/${selectedId}`, {
            onSuccess: () => setConfirmOpen(false),
        });
    };

    /* ---------------- TABLE ---------------- */

    const columns = [
        {
            header: "#",
            cell: ({ row }) => row.index + 1,
        },
        {
            header: "Category",
            accessorKey: "name",
            cell: ({ row }) => (
                <span className="font-medium">
                    {row.original.name}
                </span>
            ),
        },
        {
            header: "Description",
            cell: ({ row }) => (
                <span>{row.original.description || "-"}</span>
            ),
        },
        {
            header: "Recommendation",
            cell: ({ row }) => (
                <span className="text-sm text-gray-600">
                    {row.original.recommendation}
                </span>
            ),
        },
        {
            header: "Action",
            cell: ({ row }) => (
                <div className="space-x-2">
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEdit(row.original)}
                    >
                        Edit
                    </Button>

                    <Button
                        size="sm"
                        variant="destructive"
                        onClick={() =>
                            openConfirmDialog(row.original.id)
                        }
                    >
                        Delete
                    </Button>
                </div>
            ),
        },
    ];

    if (loading) return <PreLoader title="Feedback Categories" />;

    return (
        <div className="space-y-4">
            <Head title="Feedback Categories" />

            {/* TITLE + RIGHT BUTTON */}

                <PageTitle align="center">
                    Feedback Categories Management
                </PageTitle>

            <div className="flex justify-end mb-4">
                <Button onClick={openAdd}>
                Add Category
            </Button>
            </div>



            <Card>
                <CardHeader>
                    <CardTitle className="text-xl">
                        Category List
                    </CardTitle>
                </CardHeader>

                <CardContent>
                    <DataTable
                        columns={columns}
                        data={categories}
                        pageSize={categories.length}
                        pageIndex={pageIndex}
                        setPageIndex={setPageIndex}
                    />
                </CardContent>
            </Card>

            {/* ================= MODAL ================= */}
            {open && (
                <div className="fixed inset-0 flex items-center justify-center bg-black/40">
                    <div className="bg-white rounded-xl w-[500px] p-6 space-y-4">

                        <h2 className="text-lg font-semibold">
                            {editMode
                                ? "Edit Category"
                                : "Add Category"}
                        </h2>

                        <form onSubmit={submit} className="space-y-3">

                            <input
                                className="w-full p-2 border rounded"
                                placeholder="Category Name"
                                value={form.data.name}
                                onChange={(e) =>
                                    form.setData("name", e.target.value)
                                }
                            />

                            <textarea
                                className="w-full p-2 border rounded"
                                placeholder="Description"
                                value={form.data.description}
                                onChange={(e) =>
                                    form.setData(
                                        "description",
                                        e.target.value
                                    )
                                }
                            />

                            <textarea
                                className="w-full p-2 border rounded"
                                placeholder="Recommendation"
                                value={form.data.recommendation}
                                onChange={(e) =>
                                    form.setData(
                                        "recommendation",
                                        e.target.value
                                    )
                                }
                            />

                            <div className="flex justify-end gap-2 pt-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={closeModal}
                                >
                                    Cancel
                                </Button>

                                <Button disabled={form.processing}>
                                    Save
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ConfirmDialog
                open={confirmOpen}
                onClose={() => setConfirmOpen(false)}
                onConfirm={handleConfirmDelete}
                title="Delete Category"
                message="Are you sure you want to delete this category?"
            />
        </div>
    );
};

FeedbackCategories.layout = (page) => (
    <AuthenticatedLayout>{page}</AuthenticatedLayout>
);

export default FeedbackCategories;
