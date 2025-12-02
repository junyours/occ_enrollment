import React, { useState, useEffect } from "react";
import { Head, router } from "@inertiajs/react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/Components/ui/card";
import { Badge } from "@/Components/ui/badge";
import { Button } from "@/Components/ui/button";
import { Input } from "@/Components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/Components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/Components/ui/select";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { formatDateShort } from "@/Lib/Utils";
import { Pencil, Loader2, Eye, LayoutGrid, List, Trash2 } from "lucide-react";

export default function Evaluation({ schoolYears: initialSchoolYears }) {
    const [schoolYears, setSchoolYears] = useState(initialSchoolYears.data);
    const [paginationLinks, setPaginationLinks] = useState(initialSchoolYears.links);
    const [addingFor, setAddingFor] = useState(null);
    const [editingEval, setEditingEval] = useState(null);
    const [previewEval, setPreviewEval] = useState(null);
    const [viewMode, setViewMode] = useState(() => localStorage.getItem("evaluationViewMode") || "tile");
    const [searchTerm, setSearchTerm] = useState("");
    const [confirmingDelete, setConfirmingDelete] = useState(null);
    const [confirmUseCurrentForm, setConfirmUseCurrentForm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);


    const { toast } = useToast();

    const [form, setForm] = useState({
        school_year_id: "",
        start_date: "",
        end_date: "",
        status: "pending",
    });

    useEffect(() => {
        localStorage.setItem("evaluationViewMode", viewMode);
    }, [viewMode]);

    const today = new Date().toISOString().split("T")[0];

    const toggleViewMode = () => {
        setViewMode((prev) => (prev === "tile" ? "list" : "tile"));
    };

    const filteredSchoolYears = schoolYears.filter((sy) => {
        const yearString = `${sy.start_year}-${sy.end_year}`;
        return (
            yearString.toLowerCase().includes(searchTerm.toLowerCase()) ||
            sy.semester.semester_name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    });

    const getBadgeColor = (status) => {
        switch (status) {
            case "active":
                return "bg-green-600";
            case "closed":
                return "bg-red-600";
            default:
                return "bg-yellow-500";
        }
    };

    const submitEvaluation = async () => {
        try {
            const check = await axios.get("/api/questions/exists");
            if (!check.data.hasQuestions) {
                toast({
                    title: "No Evaluation Form Found",
                    description: "Please create the questionnaire form first.",
                    variant: "warning",
                });
                return;
            }

            if (!editingEval) {
                setConfirmUseCurrentForm(true);
            } else {
                performSaveEvaluation();
            }
        } catch (error) {
            console.error(error);
            toast({
                title: "Error Checking Questionnaire",
                description: "Unable to verify if evaluation form exists.",
                variant: "destructive",
            });
        }
    };

    const performSaveEvaluation = async () => {
        setSubmitting(true);
        setLoading(true);

        try {
            let response;
            if (editingEval) {
                response = await axios.put(route("evaluation.update", editingEval.id), form);
            } else {
                response = await axios.post(route("evaluation.store"), form);
            }

            const newEval = response.data.evaluation;

            setSchoolYears((prevYears) =>
                prevYears.map((sy) => {
                    if (sy.id === form.school_year_id) {
                        const updatedEvals = editingEval
                            ? sy.evaluations.map((ev) => (ev.id === editingEval.id ? newEval : ev))
                            : [...(sy.evaluations || []), newEval];
                        return { ...sy, evaluations: updatedEvals };
                    }
                    return sy;
                })
            );

            setAddingFor(null);
            setEditingEval(null);
            resetDialog();
            setLoading(false);

            setTimeout(() => {
                toast({
                    title: editingEval ? "Evaluation Updated" : "Evaluation Added",
                    description: editingEval
                        ? "The evaluation schedule was successfully updated."
                        : "A new evaluation schedule has been created.",
                    variant: "success",
                });
            }, 250);
        } catch (error) {
            console.error(error);
            setAddingFor(null);
            setEditingEval(null);
            resetDialog();
            setLoading(false);

            setTimeout(() => {
                if (error.response?.status === 422) {
                    toast({
                        title: "Duplicate Evaluation",
                        description:
                            error.response.data.message || "This school year already has an evaluation.",
                        variant: "warning",
                    });
                } else if (error.response?.status === 400) {
                    toast({
                        title: "No Evaluation Questions",
                        description:
                            error.response.data.message ||
                            "Please add evaluation questions before saving.",
                        variant: "warning",
                    });
                } else {
                    toast({
                        title: "Save Failed",
                        description: "Something went wrong while saving the evaluation.",
                        variant: "destructive",
                    });
                }
            }, 250);
        } finally {
            setSubmitting(false);
            setLoading(false);
        }
    };

   // Open the confirmation dialog
const deleteEvaluation = (evalId, schoolYearId) => {
    setConfirmingDelete({ evalId, schoolYearId });
};

// Confirm delete and perform the deletion
const confirmDelete = async () => {
    if (!confirmingDelete) return;

    try {
        await axios.delete(`/evaluation/${confirmingDelete.evalId}`);

        // Update state to remove deleted evaluation
        setSchoolYears((prev) =>
            prev.map((sy) => {
                if (sy.id === confirmingDelete.schoolYearId) {
                    return {
                        ...sy,
                        evaluations: sy.evaluations.filter(
                            (e) => e.id !== confirmingDelete.evalId
                        ),
                    };
                }
                return sy;
            })
        );

        toast({
            title: "Evaluation Deleted",
            description: "The evaluation has been successfully removed.",
            variant: "success",
        });
    } catch (error) {
        console.error(error);
        toast({
            title: "Delete Failed",
            description:
                error.response?.data?.message ||
                "An error occurred while deleting the evaluation.",
            variant: "destructive",
        });
    } finally {
        setConfirmingDelete(null);
    }
};


    const resetDialog = () => {
        setAddingFor(null);
        setEditingEval(null);
        setPreviewEval(null);
        setForm({
            school_year_id: "",
            start_date: "",
            end_date: "",
            status: "pending",
        });
    };

    const handlePagination = (url) => {
        router.get(url, {}, { preserveState: true, preserveScroll: true });
    };

    return (
        <div className="pb-24">
            <Head title="Evaluation Schedule Manager" />
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Evaluation Schedule Manager</h2>
                <div className="flex gap-2">
                    <Input
                        type="text"
                        placeholder="Search by year or semester"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="max-w-xs"
                    />
                    <Button onClick={toggleViewMode}>
                        {viewMode === "tile" ? (
                            <>
                                <List className="w-4 h-4 mr-1" /> List
                            </>
                        ) : (
                            <>
                                <LayoutGrid className="w-4 h-4 mr-1" /> Tile
                            </>
                        )}
                    </Button>
                </div>
            </div>

            {loading && (
                <div className="flex items-center gap-2 mb-4 text-blue-600">
                    <Loader2 className="w-5 h-5 animate-spin" /> Updating...
                </div>
            )}

            {viewMode === "tile" ? (
                // ✅ TILE VIEW
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
                    {filteredSchoolYears.map((sy) => (
                        <Card
                            key={sy.id}
                            className="relative overflow-hidden transition-all duration-200 bg-white border border-gray-200 shadow-lg rounded-xl hover:shadow-2xl"
                            >
                            {/* Header */}
                            <CardHeader
                                className="relative flex items-center justify-between p-4 text-white bg-gradient-to-r from-indigo-500 to-purple-500"
                            >
                                <div>
                                <CardTitle className="text-lg font-semibold">{`${sy.start_year}-${sy.end_year}`}</CardTitle>
                                <p className="mt-1 text-sm opacity-90">{sy.semester.semester_name} Semester</p>
                                </div>

                                {/* Active Ribbon */}
                                {sy.is_current === 1 && (
                                <Badge className="absolute px-3 py-1 text-white bg-green-500 rounded-full shadow top-3 right-3">
                                    Active
                                </Badge>
                                )}
                            </CardHeader>

                            <CardContent className="p-4 space-y-4">
                                {/* Evaluations */}
                                {(sy.evaluations ?? []).length > 0 ? (
                                <div className="space-y-3">
                                    {sy.evaluations.map((evalItem) => (
                                    <div
                                        key={evalItem.id}
                                        className="flex items-center justify-between p-3 transition border border-gray-100 rounded-lg shadow-sm bg-gray-50 hover:bg-white"
                                    >
                                        {/* Evaluation info */}
                                        <div className="flex flex-col space-y-1">
                                        <span className="font-medium text-gray-800">
                                            {formatDateShort(evalItem.start_date)} - {formatDateShort(evalItem.end_date)}
                                        </span>
                                        <Badge
                                            className={`${getBadgeColor(evalItem.status)} text-white px-2 py-0.5 rounded-full`}
                                        >
                                            {evalItem.status}
                                        </Badge>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-2">
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="hover:bg-gray-200"
                                            onClick={() =>
                                            setPreviewEval({
                                                ...evalItem,
                                                semester: sy.semester,
                                                yearRange: `${sy.start_year}-${sy.end_year}`,
                                            })
                                            }
                                        >
                                            <Eye className="w-4 h-4 text-gray-700" />
                                        </Button>


                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="hover:bg-gray-200"
                                                onClick={() => {
                                                setEditingEval(evalItem);
                                                setForm({
                                                    school_year_id: sy.id,
                                                    start_date: evalItem.start_date,
                                                    end_date: evalItem.end_date,
                                                    status: evalItem.status,
                                                });
                                                setAddingFor(sy);
                                                }}
                                            >
                                                <Pencil className="w-4 h-4 text-gray-700" />
                                            </Button>
                                            {sy.is_current === 1 && (
                                            <>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="hover:bg-red-100"
                                                onClick={() => deleteEvaluation(evalItem.id, sy.id)}
                                            >
                                                <Trash2 className="w-4 h-4 text-red-600" />
                                            </Button>
                                            </>
                                        )}
                                        </div>
                                    </div>
                                    ))}
                                </div>
                                ) : sy.is_current === 1 ? (
                                <Button
                                    className="w-full mt-2 text-white bg-indigo-500 hover:bg-indigo-600"
                                    onClick={() => {
                                    setForm({
                                        school_year_id: sy.id,
                                        start_date: "",
                                        end_date: "",
                                        status: "pending",
                                    });
                                    setAddingFor(sy);
                                    }}
                                >
                                    Add Evaluation
                                </Button>
                                ) : (
                                <p className="mt-3 italic text-center text-gray-400">No evaluations yet.</p>
                                )}
                            </CardContent>
                            </Card>

                    ))}
                </div>
            ) : (
                // ✅ LIST VIEW
                <div className="overflow-auto border rounded-md">
                    <table className="min-w-full border-collapse">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="px-4 py-2 text-left">Year</th>
                                <th className="px-4 py-2 text-left">Semester</th>
                                <th className="px-4 py-2 text-left">Evaluations</th>
                                <th className="px-4 py-2 text-left">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredSchoolYears.map((sy) => (
                                <tr key={sy.id} className="border-t">
                                    <td className="px-4 py-2">{`${sy.start_year}-${sy.end_year}`}</td>
                                    <td className="px-4 py-2">{sy.semester.semester_name}</td>
                                    <td className="px-4 py-2">
                                        {(sy.evaluations ?? []).map((evalItem) => (
                                            <div key={evalItem.id} className="mb-1">
                                                {formatDateShort(evalItem.start_date)} to{" "}
                                                {formatDateShort(evalItem.end_date)} —{" "}
                                                <Badge
                                                    className={`${getBadgeColor(
                                                        evalItem.status
                                                    )} text-white ml-1`}
                                                >
                                                    {evalItem.status}
                                                </Badge>
                                            </div>
                                        ))}
                                    </td>
                                    <td className="px-4 py-2">
                                        {(sy.evaluations ?? []).map((evalItem) => (
                                            <div key={evalItem.id} className="flex gap-1 mb-1">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() =>
                                                        setPreviewEval({
                                                            ...evalItem,
                                                            semester: sy.semester,
                                                            yearRange: `${sy.start_year}-${sy.end_year}`,
                                                        })
                                                    }
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </Button>

                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => {
                                                                setEditingEval(evalItem);
                                                                setForm({
                                                                    school_year_id: sy.id,
                                                                    start_date: evalItem.start_date,
                                                                    end_date: evalItem.end_date,
                                                                    status: evalItem.status,
                                                                });
                                                                setAddingFor(sy);
                                                            }}
                                                        >
                                                            <Pencil className="w-4 h-4" />
                                                        </Button>
                                                        {sy.is_current === 1 && (
                                                    <>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() =>
                                                                deleteEvaluation(evalItem.id, sy.id)
                                                            }
                                                        >
                                                            <Trash2 className="w-4 h-4 text-red-600" />
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        ))}
                                        {sy.is_current === 1 && (!sy.evaluations || sy.evaluations.length === 0) && (
                                            <Button
                                                size="sm"
                                                className="mt-2"
                                                onClick={() => {
                                                    setForm({
                                                        school_year_id: sy.id,
                                                        start_date: "",
                                                        end_date: "",
                                                        status: "pending",
                                                    });
                                                    setAddingFor(sy);
                                                }}
                                            >
                                                Add Evaluation
                                            </Button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* 🧩 Add / Edit Evaluation Dialog */}
            <Dialog open={!!addingFor} onOpenChange={resetDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingEval ? "Edit" : "Add"} Evaluation</DialogTitle>
                        <DialogDescription>
                            For {addingFor?.start_year} - {addingFor?.end_year} (
                            {addingFor?.semester.semester_name} Semester)
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <Input
                                type="date"
                                min={today}
                                value={form.start_date}
                                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                            />
                            <Input
                                type="date"
                                min={today}
                                value={form.end_date}
                                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                            />
                        </div>
                        <Select
                            value={form.status}
                            onValueChange={(val) => setForm({ ...form, status: val })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select status..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="closed">Closed</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <DialogFooter>
                        <Button onClick={submitEvaluation} disabled={submitting}>
                            {submitting
                                ? "Saving..."
                                : editingEval
                                ? "Update"
                                : "Save"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* 🧩 Preview Dialog */}
            <Dialog open={!!previewEval} onOpenChange={() => setPreviewEval(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Questionnaire Preview</DialogTitle>
                        <DialogDescription>
                            {previewEval?.yearRange} — {previewEval?.semester?.semester_name} Semester
                            <br />
                            Schedule: {formatDateShort(previewEval?.start_date)} to{" "}
                            {formatDateShort(previewEval?.end_date)} —{" "}
                            <Badge
                                className={`${getBadgeColor(previewEval?.status)} text-white ml-1`}
                            >
                                {previewEval?.status}
                            </Badge>
                        </DialogDescription>
                    </DialogHeader>
                    <div className="max-h-[50vh] overflow-y-auto p-4 space-y-4">
                        {previewEval?.evaluation_questions &&
                            Object.values(
                                previewEval.evaluation_questions.reduce(
                                    (acc, q) => {
                                        const key = q.criteria_id;
                                        if (!acc[key])
                                            acc[key] = {
                                                title:
                                                    q.criteria_title ||
                                                    "Untitled Criteria",
                                                questions: [],
                                            };
                                        acc[key].questions.push(q);
                                        return acc;
                                    },
                                    {}
                                )
                            ).map((group, idx) => (
                                <div key={idx}>
                                    <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                                        {group.title}
                                    </h3>
                                    <ul className="ml-6 text-sm text-gray-600 list-disc dark:text-gray-400">
                                        {group.questions.map((q) => (
                                            <li key={q.id}>
                                                {q.question_text}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}

                    </div>
                </DialogContent>
            </Dialog>

            {/* 🧩 Delete Confirmation Dialog */}
<Dialog open={!!confirmingDelete} onOpenChange={() => setConfirmingDelete(null)}>
    <DialogContent>
        <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
            <DialogDescription>
                Are you sure you want to delete this evaluation? This action cannot be undone.
            </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirmingDelete(null)}>
                Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
                Delete
            </Button>
        </DialogFooter>
    </DialogContent>
</Dialog>


            <Dialog open={confirmUseCurrentForm} onOpenChange={() => setConfirmUseCurrentForm(false)}>
    <DialogContent>
        <DialogHeader>
            <DialogTitle>Use Current Evaluation Questionnaire?</DialogTitle>
            <DialogDescription>
                Do you want to use the existing evaluation questionnaire for this schedule?
            </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => {
                setConfirmUseCurrentForm(false);
                // Redirect to questionnaire builder page
                router.visit(route("guidance.questionnaire"));
            }}>
                No, Edit Questionnaire
            </Button>
            <Button onClick={() => {
                setConfirmUseCurrentForm(false);
                performSaveEvaluation();
            }}>
                Yes, Use Current Questionnaire
            </Button>
        </DialogFooter>
    </DialogContent>
</Dialog>


           <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-md xl:ml-64">
    <div className="flex flex-wrap justify-center gap-2 px-4 py-3 mx-auto max-w-7xl">
        {paginationLinks.map((link, index) => (
            <Button
                key={index}
                size="sm"
                variant={link.active ? "default" : "outline"}
                disabled={!link.url}
                onClick={() => handlePagination(link.url)}
                dangerouslySetInnerHTML={{ __html: link.label }}
            />
        ))}
    </div>

</div>


        </div>


    );
}

Evaluation.layout = (page) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;
