import PreLoader from "@/Components/preloader/PreLoader";
import { Card, CardContent, CardHeader, CardTitle } from "@/Components/ui/card";
import { Head, usePage } from "@inertiajs/react";
import axios from "axios";
import React, { useEffect, useState } from "react";
import { PageTitle } from "@/Components/ui/PageTitle";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Button } from "@/Components/ui/button";
import DataTable from "@/Components/ui/dTable";
import AddCriteria from "./AddCriteria";
import ConfirmDialog from "@/Components/ui/ConfirmDialog";

const Criteria = () => {
    const { user } = usePage().props.auth;
    const { criteria } = usePage().props;
    const [loading, setLoading] = useState(true);
    const [pageIndex, setPageIndex] = useState(0);
    const [open, setOpen] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [selectedId, setSelectedId] = useState(null);

    // 🔹 Added states for editing
    const [editMode, setEditMode] = useState(false);
    const [selectedCriteria, setSelectedCriteria] = useState(null);

    const openConfirmDialog = (id) => {
        setSelectedId(id);
        setConfirmOpen(true);
    };

    const handleConfirmDelete = async () => {
        try {
            await axios.delete(`/criteria/${selectedId}`);
            window.location.reload(); // Or trigger a re-fetch instead
        } catch (error) {
            console.error(error);
            alert("Failed to delete.");
        }
    };

    useEffect(() => {
        setLoading(false);
    }, [criteria]);

    const columns = [
        {
            colName: "#",
            header: "#",
            accessorKey: "id",
            headerClassName: "w-10 text-center",
            cell: ({ row }) => <span>{row.index + 1}</span>,
        },
        {
            colName: "Criteria Title",
            header: "Criteria Title",
            accessorKey: "title",
            headerClassName: "w-60 text-center",
            cell: ({ row }) => (
                <span className="font-medium">{row.original.title}</span>
            ),
        },
        {
            colName: "Recommendation",
            header: "Recommendation",
            accessorKey: "recommendation",
            headerClassName: "w-60 text-center",
            cell: ({ row }) => <span>{row.original.recommendation}</span>,
        },
        {
            colName: "Suggestion",
            header: "Suggestion",
            accessorKey: "suggestion",
            headerClassName: "w-60 text-center",
            cell: ({ row }) => <span>{row.original.suggestion}</span>,
        },
        {
            colName: "Action",
            header: "Action",
            headerClassName: "w-60 text-center",
            cell: ({ row }) => (
                <div className="space-x-2">
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                            // 🔹 Open modal in edit mode
                            setSelectedCriteria(row.original);
                            setEditMode(true);
                            setOpen(true);
                        }}
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
    ];

    if (loading) return <PreLoader title="Criteria" />;

    return (
        <div className="space-y-4">
            <Head title="Criteria" />
            <PageTitle align="center">Evaluation Criteria</PageTitle>

            {user.user_role === "guidance" && (
                <>
                    <Button
                        onClick={() => {
                            setEditMode(false);
                            setSelectedCriteria(null);
                            setOpen(true);
                        }}
                        className="mb-4"
                    >
                        Add Criteria
                    </Button>

                    {/* 🔹 Pass edit props to modal */}
                    <AddCriteria
                        open={open}
                        setOpen={(value) => {
                            setOpen(value);
                            if (!value) {
                                setEditMode(false);
                                setSelectedCriteria(null);
                            }
                        }}
                        editMode={editMode}
                        criteriaData={selectedCriteria}
                    />
                </>
            )}

            <Card>
                <CardHeader>
                    <CardTitle className="text-xl">List of Criteria</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                    {criteria.length > 0 ? (
                        <DataTable
                            columns={columns}
                            data={criteria}
                            pageSize={criteria.length}
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

            <ConfirmDialog
                open={confirmOpen}
                onClose={() => setConfirmOpen(false)}
                onConfirm={handleConfirmDelete}
                title="Delete Criteria"
                message="Are you sure you want to delete this criterion? This action cannot be undone."
            />
        </div>
    );
};

export default Criteria;

Criteria.layout = (page) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;
