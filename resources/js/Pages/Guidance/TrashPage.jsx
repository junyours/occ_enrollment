import React, { useState, useMemo, useEffect } from "react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head, usePage, router } from "@inertiajs/react";
import { Card, CardHeader, CardContent, CardTitle } from "@/Components/ui/card";
import { Input } from "@/Components/ui/input";
import { Button } from "@/Components/ui/button";
import { Search, Trash2, Undo2, FileText, ListTree, ClipboardList } from "lucide-react";

export default function TrashPage({
    auth,
    title,
    deletedQuestions = [],
    deletedCriteria = [],
    deletedEvaluations = []
}) {
    const { props: pageProps } = usePage();
    const [search, setSearch] = useState("");
    const [activeTab, setActiveTab] = useState("all");
    const [trash, setTrash] = useState({
        questions: [],
        criteria: [],
        evaluations: []
    });

    const [confirmDelete, setConfirmDelete] = useState({
        show: false,
        type: "",
        item: null
    });

    const [confirmDeleteAll, setConfirmDeleteAll] = useState({
        show: false,
        tab: ""
    });



    const [toast, setToast] = useState({ message: "", type: "" });

    const setNotification = (message, type = "success", duration = 3000) => {
        setToast({ message, type });
        setTimeout(() => setToast({ message: "", type: "" }), duration);
    };

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const message = params.get("message");
        const type = params.get("type");
        if (message) {
            setNotification(message, type || "success");
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }, []);

    // Initialize trash lists
    useEffect(() => {
        setTrash({
            questions: deletedQuestions.map(q => ({
                id: q.id,
                title: q.text,
                deleted_at: q.deleted_at
            })),
            criteria: deletedCriteria.map(c => ({
                id: c.id,
                title: c.title,
                deleted_at: c.deleted_at
            })),
            evaluations: deletedEvaluations.map(e => ({
                id: e.id,
                title: `Evaluation (${e.start_date} → ${e.end_date})`,
                deleted_at: e.deleted_at
            }))
        });
    }, [deletedQuestions, deletedCriteria, deletedEvaluations]);

    const iconMap = {
        questions: <ClipboardList className="w-5 h-5 text-blue-600" />,
        criteria: <ListTree className="w-5 h-5 text-green-600" />,
        evaluations: <FileText className="w-5 h-5 text-purple-600" />
    };

    const formatDate = (dateString) => new Date(dateString).toLocaleString();

    const filteredItems = useMemo(() => {
        if (activeTab === "all") {
            const all = [
                ...trash.questions.map(i => ({ ...i, type: "questions" })),
                ...trash.criteria.map(i => ({ ...i, type: "criteria" })),
                ...trash.evaluations.map(i => ({ ...i, type: "evaluations" }))
            ];
            return all.filter(i => i.title?.toLowerCase().includes(search.toLowerCase()));
        }
        return trash[activeTab].filter(i => i.title?.toLowerCase().includes(search.toLowerCase()));
    }, [trash, activeTab, search]);

    /** -------------------------------
     *  RESTORE SINGLE ITEM (with fix)
     --------------------------------*/
    const restoreItem = (type, item) => {
        const backendType =
            type === "questions" ? "question" :
            type === "evaluations" ? "evaluation" :
            "criteria";

        router.post("/trash/restore", { id: item.id, type: backendType }, {
            onSuccess: () => {
                setTrash(prev => ({
                    ...prev,
                    [type]: prev[type].filter(i => i.id !== item.id)
                }));
                setNotification("Item restored successfully", "success");
            },
            onError: () => setNotification("Failed to restore item", "error")
        });
    };

    /** -------------------------------
     *  DELETE SINGLE ITEM (with fix)
     --------------------------------*/
    const deleteItem = (type, item) => {
        setConfirmDelete({
            show: true,
            type,
            item
        });
    };

    const confirmDeleteAction = () => {
        const { type, item } = confirmDelete;

        const backendType =
            type === "questions" ? "question" :
            type === "evaluations" ? "evaluation" :
            "criteria";

        router.delete(`/trash/delete/${backendType}/${item.id}`, {
            onSuccess: () => {
                setTrash(prev => ({
                    ...prev,
                    [type]: prev[type].filter(i => i.id !== item.id)
                }));
                setNotification("Item permanently deleted", "success");
                setConfirmDelete({ show: false, type: "", item: null });
            },
            onError: () => {
                setNotification("Failed to delete item", "error");
                setConfirmDelete({ show: false, type: "", item: null });
            }
        });
    };


    /** -------------------------------------
     *  RESTORE ALL (with type conversion)
     --------------------------------------*/
    const restoreAll = () => {
        const body =
            activeTab === "all"
                ? {}
                : { type: activeTab === "questions" ? "question" : activeTab === "evaluations" ? "evaluation" : "criteria" };

        router.post("/trash/restore-all", body, {
            onSuccess: () => {
                setTrash({
                    questions: activeTab === "all" || activeTab === "questions" ? [] : trash.questions,
                    criteria: activeTab === "all" || activeTab === "criteria" ? [] : trash.criteria,
                    evaluations: activeTab === "all" || activeTab === "evaluations" ? [] : trash.evaluations
                });
                setNotification("Restored successfully", "success");
            },
            onError: () => setNotification("Failed to restore", "error")
        });
    };

    /** -------------------------------------
     *  DELETE ALL (with type conversion)
     --------------------------------------*/
    const deleteAll = () => {
        setConfirmDeleteAll({
            show: true,
            tab: activeTab
        });
    };

    const confirmDeleteAllAction = () => {
        const tab = confirmDeleteAll.tab;

        const body =
            tab === "all"
                ? {}
                : { type: tab === "questions" ? "question" : tab === "evaluations" ? "evaluation" : "criteria" };

        router.delete("/trash/delete-all", body, {
            onSuccess: () => {
                setTrash({
                    questions: tab === "all" || tab === "questions" ? [] : trash.questions,
                    criteria: tab === "all" || tab === "criteria" ? [] : trash.criteria,
                    evaluations: tab === "all" || tab === "evaluations" ? [] : trash.evaluations,
                });

                setNotification("All items deleted", "success");
                setConfirmDeleteAll({ show: false, tab: "" });
            },
            onError: () => {
                setNotification("Failed to delete items", "error");
                setConfirmDeleteAll({ show: false, tab: "" });
            }
        });
    };



    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title={title} />

            <div className="p-6 mx-auto space-y-6">
                <h1 className="text-2xl font-bold text-gray-800">{title}</h1>
                <p className="text-sm text-gray-500">All deleted items are stored here until restored or permanently removed.</p>

                {toast.message && (
                    <div className={`fixed top-5 right-5 z-50 px-4 py-2 rounded shadow-md text-white
                        ${toast.type === "success" ? "bg-green-600" : "bg-red-600"}`}>
                        {toast.message}
                    </div>
                )}

                <div className="flex gap-4 border-b border-gray-200">
                    {["all", "questions", "criteria", "evaluations"].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`py-2 px-4 font-medium ${
                                activeTab === tab ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-600 hover:text-gray-800"
                            }`}
                        >
                            {tab === "all" ? "All Trash" : tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-2 p-3 bg-white border rounded-md shadow-sm">
                    <Search className="w-5 h-5 text-gray-500" />
                    <Input
                        placeholder={`Search deleted ${activeTab === "all" ? "items" : activeTab}...`}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full"
                    />
                </div>

                <div className="flex gap-3">
                    <Button
                        onClick={restoreAll}
                        disabled={filteredItems.length === 0}
                        className="flex items-center gap-2 text-white bg-green-600 hover:bg-green-700"
                    >
                        <Undo2 className="w-4 h-4" /> Restore All
                    </Button>

                    <Button
                        onClick={deleteAll}
                        disabled={filteredItems.length === 0}
                        variant="destructive"
                        className="flex items-center gap-2"
                    >
                        <Trash2 className="w-4 h-4" /> Delete All
                    </Button>
                </div>

                <Card className="border border-red-200 shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-lg font-semibold text-red-600">
                            {activeTab === "all"
                                ? `All Deleted Items (${filteredItems.length})`
                                : `Deleted ${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} (${filteredItems.length})`}
                        </CardTitle>
                    </CardHeader>

                    <CardContent className="space-y-4">
                        {filteredItems.length ? (
                            filteredItems.map(item => {
                                const type = item.type || activeTab;

                                return (
                                    <div
                                        key={`${type}-${item.id}`}
                                        className="flex items-center justify-between p-3 bg-white border rounded-md hover:bg-gray-50"
                                    >
                                        <div className="flex items-center gap-3">
                                            {iconMap[type]}
                                            <div>
                                                <p className="font-medium text-gray-800">{item.title}</p>
                                                <p className="text-xs text-gray-500 capitalize">
                                                    {type.slice(0, -1)} • Deleted at:{" "}
                                                    <span className="font-semibold text-red-600">{formatDate(item.deleted_at)}</span>
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => restoreItem(type, item)}
                                                className="flex items-center gap-2"
                                            >
                                                <Undo2 className="w-4 h-4" /> Restore
                                            </Button>

                                            <Button
                                                variant="destructive"
                                                size="sm"
                                                onClick={() => deleteItem(type, item)}
                                                className="flex items-center gap-2"
                                            >
                                                <Trash2 className="w-4 h-4" /> Delete
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="py-10 text-center text-gray-500">
                                <Trash2 className="w-10 h-10 mx-auto mb-3 text-gray-400" />
                                No deleted items found.
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {confirmDelete.show && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
                <div className="p-6 bg-white rounded-lg shadow-lg w-96">
                    <h2 className="mb-3 text-lg font-semibold text-red-600">Confirm Delete</h2>
                    <p className="mb-5 text-gray-700">
                        Are you sure you want to permanently delete this{" "}
                        <span className="font-semibold">{confirmDelete.type}</span>?
                    </p>

                    <div className="flex justify-end gap-3">
                        <Button
                            variant="outline"
                            onClick={() => setConfirmDelete({ show: false, type: "", item: null })}
                        >
                            Cancel
                        </Button>

                        <Button
                            variant="destructive"
                            onClick={confirmDeleteAction}
                        >
                            Delete
                        </Button>
                    </div>
                </div>
            </div>
        )}

        {confirmDeleteAll.show && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
                <div className="p-6 bg-white rounded-lg shadow-lg w-96">
                    <h2 className="mb-3 text-lg font-semibold text-red-600">Confirm Delete All</h2>

                    <p className="mb-5 text-gray-700">
                        Are you sure you want to permanently delete all{" "}
                        <span className="font-semibold capitalize">{confirmDeleteAll.tab}</span>?
                    </p>

                    <div className="flex justify-end gap-3">
                        <Button
                            variant="outline"
                            onClick={() => setConfirmDeleteAll({ show: false, tab: "" })}
                        >
                            Cancel
                        </Button>

                        <Button
                            variant="destructive"
                            onClick={confirmDeleteAllAction}
                        >
                            Delete All
                        </Button>
                    </div>
                </div>
            </div>
        )}
        </AuthenticatedLayout>
    );
}
