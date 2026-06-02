import PreLoader from "@/Components/preloader/PreLoader";
import { Card, CardContent, CardHeader, CardTitle } from "@/Components/ui/card";
import { Head, useForm, usePage } from "@inertiajs/react";
import React, { useEffect, useMemo, useState } from "react";
import { PageTitle } from "@/Components/ui/PageTitle";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Button } from "@/Components/ui/button";
import DataTable from "@/Components/ui/dTable";
import ConfirmDialog from "@/Components/ui/ConfirmDialog";

const Languages = () => {
    const { languages } = usePage().props;

    const [loading, setLoading] = useState(true);
    const [pageIndex, setPageIndex] = useState(0);

    const [open, setOpen] = useState(false); // modal open
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [selectedId, setSelectedId] = useState(null);

    const [editMode, setEditMode] = useState(false);
    const [selectedLanguage, setSelectedLanguage] = useState(null);

    const form = useForm({
        name: "",
        code: "",
    });

    useEffect(() => {
        setLoading(false);
    }, [languages]);

    const openAdd = () => {
        setEditMode(false);
        setSelectedLanguage(null);
        form.reset();
        setOpen(true);
    };

    const openEdit = (lang) => {
        setEditMode(true);
        setSelectedLanguage(lang);
        form.setData({
            name: lang.name ?? "",
            code: lang.code ?? "",
        });
        setOpen(true);
    };

    const openConfirmDialog = (id) => {
        setSelectedId(id);
        setConfirmOpen(true);
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (editMode && selectedLanguage?.id) {
            form.put(`/Guidance/languages/${selectedLanguage.id}`, {
                onSuccess: () => {
                    form.reset();
                    setOpen(false);
                    setEditMode(false);
                    setSelectedLanguage(null);
                },
            });
        } else {
            form.post("/Guidance/languages", {
                onSuccess: () => {
                    form.reset();
                    setOpen(false);
                },
            });
        }
    };

    const handleConfirmDelete = () => {
        if (!selectedId) return;

        form.delete(`/Guidance/languages/${selectedId}`, {
            onSuccess: () => setConfirmOpen(false),
        });
    };

    const columns = useMemo(
        () => [
            {
                colName: "#",
                header: "#",
                headerClassName: "w-10 text-center",
                cell: ({ row }) => <span>{row.index + 1}</span>,
            },
            {
                colName: "Language",
                header: "Language",
                accessorKey: "name",
                cell: ({ row }) => (
                    <span className="font-medium">{row.original.name}</span>
                ),
            },
            {
                colName: "Code",
                header: "Code",
                accessorKey: "code",
                cell: ({ row }) => (
                    <span className="uppercase">{row.original.code}</span>
                ),
            },
            {
                colName: "Action",
                header: "Action",
                headerClassName: "w-56 text-center",
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
                            onClick={() => openConfirmDialog(row.original.id)}
                        >
                            Delete
                        </Button>
                    </div>
                ),
            },
        ],
        [languages]
    );

    if (loading) return <PreLoader title="Languages" />;

    return (
        <div className="space-y-4">
            <Head title="Languages" />
            <PageTitle align="center">Languages Management</PageTitle>

            <div className="flex justify-end">
                <Button onClick={openAdd}>Add Language</Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-xl">List of Languages</CardTitle>
                </CardHeader>
                <CardContent>
                    {languages?.length ? (
                        <DataTable
                            columns={columns}
                            data={languages}
                            pageSize={languages.length}
                            pageIndex={pageIndex}
                            setPageIndex={setPageIndex}
                        />
                    ) : (
                        <div className="py-8 text-sm text-center text-gray-500">
                            No data available.
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* ✅ MODAL (same file) */}
            {open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40">
                    <div className="w-full max-w-md bg-white shadow-lg rounded-xl">
                        <div className="px-6 py-4 border-b">
                            <h2 className="text-lg font-semibold">
                                {editMode ? "Edit Language" : "Add Language"}
                            </h2>
                            <p className="text-sm text-gray-500">
                                Use standard codes like <span className="font-medium">en</span>,{" "}
                                <span className="font-medium">ceb</span>,{" "}
                                <span className="font-medium">tl</span>.
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
                            <div className="space-y-1">
                                <label className="text-sm text-gray-600">Language Name</label>
                                <input
                                    className="w-full p-2 border rounded-lg"
                                    value={form.data.name}
                                    onChange={(e) => form.setData("name", e.target.value)}
                                    placeholder="English"
                                />
                                {form.errors.name && (
                                    <div className="text-sm text-red-600">{form.errors.name}</div>
                                )}
                            </div>

                            <div className="space-y-1">
                                <label className="text-sm text-gray-600">Code</label>
                                <input
                                    className="w-full p-2 border rounded-lg"
                                    value={form.data.code}
                                    onChange={(e) =>
                                        form.setData("code", e.target.value.toLowerCase())
                                    }
                                    placeholder="en"
                                />
                                {form.errors.code && (
                                    <div className="text-sm text-red-600">{form.errors.code}</div>
                                )}
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        setOpen(false);
                                        setEditMode(false);
                                        setSelectedLanguage(null);
                                        form.clearErrors();
                                    }}
                                >
                                    Cancel
                                </Button>
                                <Button disabled={form.processing}>
                                    {editMode ? "Update" : "Save"}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ✅ CONFIRM DELETE */}
            <ConfirmDialog
                open={confirmOpen}
                onClose={() => setConfirmOpen(false)}
                onConfirm={handleConfirmDelete}
                title="Delete Language"
                message="Are you sure you want to delete this language? This action cannot be undone."
            />
        </div>
    );
};

Languages.layout = (page) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;
export default Languages;
