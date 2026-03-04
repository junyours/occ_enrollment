import PreLoader from "@/Components/preloader/PreLoader";
import { Card, CardContent, CardHeader, CardTitle } from "@/Components/ui/card";
import { Head, useForm, usePage } from "@inertiajs/react";
import React, { useEffect, useState } from "react";
import { PageTitle } from "@/Components/ui/PageTitle";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Button } from "@/Components/ui/button";
import DataTable from "@/Components/ui/dTable";
import ConfirmDialog from "@/Components/ui/ConfirmDialog";

const FeedbackKeywords = () => {

    const { keywords, categories, languages } = usePage().props;

    const [loading, setLoading] = useState(true);
    const [pageIndex, setPageIndex] = useState(0);

    const [open, setOpen] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [selectedId, setSelectedId] = useState(null);

    const [editMode, setEditMode] = useState(false);
    const [selectedKeyword, setSelectedKeyword] = useState(null);

    const form = useForm({
        feedback_category_id: "",
        language_id: "",
        keyword: "",
        type: "strength",
        sentiment: "neutral",
    });

    useEffect(() => {
        setLoading(false);
    }, [keywords]);

    /* ---------------- OPEN MODAL ---------------- */

    const openAdd = () => {
        setEditMode(false);
        setSelectedKeyword(null);
        form.reset();
        setOpen(true);
    };

    const openEdit = (data) => {
        setEditMode(true);
        setSelectedKeyword(data);

        form.setData({
            feedback_category_id: data.feedback_category_id,
            language_id: data.language_id,
            keyword: data.keyword,
            type: data.type,
            sentiment: data.sentiment ?? "neutral",
        });

        setOpen(true);
    };

    /* ---------------- SUBMIT ---------------- */

    const submit = (e) => {
        e.preventDefault();

        if (editMode) {
            form.put(`/Guidance/feedback-keywords/${selectedKeyword.id}`, {
                onSuccess: () => setOpen(false),
            });
        } else {
            form.post("/Guidance/feedback-keywords", {
                onSuccess: () => {
                    form.reset();
                    setOpen(false);
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
        form.delete(`/Guidance/feedback-keywords/${selectedId}`, {
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
            header: "Keyword",
            accessorKey: "keyword",
            cell: ({ row }) => (
                <span className="font-medium">
                    {row.original.keyword}
                </span>
            ),
        },
        {
            header: "Category",
            cell: ({ row }) => row.original.category?.name,
        },
        {
            header: "Language",
            cell: ({ row }) => row.original.language?.name,
        },
        {
            header: "Type",
            cell: ({ row }) => (
                <span
                    className={`px-2 py-1 rounded text-xs ${
                        row.original.type === "strength"
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                    }`}
                >
                    {row.original.type}
                </span>
            ),
        },
        {
            header: "Sentiment",
            cell: ({ row }) => (
                <span
                className={`px-2 py-1 rounded text-xs ${
                    row.original.sentiment === "positive"
                    ? "bg-green-100 text-green-700"
                    : row.original.sentiment === "negative"
                    ? "bg-red-100 text-red-700"
                    : "bg-gray-100 text-gray-600"
                }`}
                >
                {row.original.sentiment}
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

    if (loading) return <PreLoader title="Feedback Keywords" />;

    return (
        <div className="space-y-4">
            <Head title="Feedback Keywords" />
            <PageTitle align="center">
                Feedback Keywords Management
            </PageTitle>

            <div className="flex justify-end mb-4">
                <Button onClick={openAdd}>
                    Add Keyword
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-xl">
                        Keyword List
                    </CardTitle>
                </CardHeader>

                <CardContent>
                    <DataTable
                        columns={columns}
                        data={keywords}
                        pageSize={keywords.length}
                        pageIndex={pageIndex}
                        setPageIndex={setPageIndex}
                    />
                </CardContent>
            </Card>

            {/* ================= MODAL ================= */}
            {open && (
                <div className="fixed inset-0 flex items-center justify-center bg-black/40">
                    <div className="bg-white rounded-xl w-[420px] p-6 space-y-4">

                        <h2 className="text-lg font-semibold">
                            {editMode ? "Edit Keyword" : "Add Keyword"}
                        </h2>

                        <form onSubmit={submit} className="space-y-3">

                            {/* CATEGORY */}
                            <select
                                className="w-full p-2 border rounded"
                                value={form.data.feedback_category_id}
                                onChange={(e) =>
                                    form.setData(
                                        "feedback_category_id",
                                        e.target.value
                                    )
                                }
                            >
                                <option value="">Select Category</option>
                                {categories.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.name}
                                    </option>
                                ))}
                            </select>

                            {/* LANGUAGE */}
                            <select
                                className="w-full p-2 border rounded"
                                value={form.data.language_id}
                                onChange={(e) =>
                                    form.setData(
                                        "language_id",
                                        e.target.value
                                    )
                                }
                            >
                                <option value="">Select Language</option>
                                {languages.map((l) => (
                                    <option key={l.id} value={l.id}>
                                        {l.name}
                                    </option>
                                ))}
                            </select>

                            {/* KEYWORD */}
                            <input
                                className="w-full p-2 border rounded"
                                placeholder="Keyword"
                                value={form.data.keyword}
                                onChange={(e) =>
                                    form.setData("keyword", e.target.value)
                                }
                            />

                            {/* TYPE */}
                            <select
                                className="w-full p-2 border rounded"
                                value={form.data.type}
                                onChange={(e) =>
                                    form.setData("type", e.target.value)
                                }
                            >
                                <option value="strength">Strength</option>
                                <option value="weakness">Weakness</option>
                            </select>

                            {/* Sentiment */}
                            <select
                                className="w-full p-2 border rounded"
                                value={form.data.sentiment}
                                onChange={(e) => form.setData("sentiment", e.target.value)}
                                >
                                <option value="positive">Positive</option>
                                <option value="neutral">Neutral</option>
                                <option value="negative">Negative</option>
                            </select>

                            <div className="flex justify-end gap-2 pt-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setOpen(false)}
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
                title="Delete Keyword"
                message="Are you sure you want to delete this keyword?"
            />
        </div>
    );
};

FeedbackKeywords.layout = (page) => (
    <AuthenticatedLayout>{page}</AuthenticatedLayout>
);

export default FeedbackKeywords;
