    import React, { useState } from "react";
    import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
    import { Card, CardHeader, CardContent } from "@/Components/ui/card";
    import { Button } from "@/Components/ui/button";
    import { Input } from "@/Components/ui/input";
    import { X } from "lucide-react";
    import { Head, router } from "@inertiajs/react";
    import axios from "axios";

    export default function Questionnaire({ criteria = [], lastPosition }) {
        console.log("Last Position:", lastPosition);
        const initialCriteriaList = criteria.map((c) => ({
            id: c.id,
            title: c.title,
            questions: c.questions || [],
        }));

        const [criteriaList, setCriteriaList] = useState(initialCriteriaList);
        const [addingCriteria, setAddingCriteria] = useState(false);
        const [editMode, setEditMode] = useState(false);
        const [notification, setNotification] = useState(null);
        const [deletedQuestions, setDeletedQuestions] = useState([]);
        const [newCriteria, setNewCriteria] = useState({
            title: "",
            questions: [],
        });

        const updateQuestion = (criteriaId, index, value) => {
            setCriteriaList(
                criteriaList.map((c) => {
                    if (c.id === criteriaId) {
                        const updatedQuestions = [...c.questions];
                        updatedQuestions[index] = { ...updatedQuestions[index], text: value };
                        return { ...c, questions: updatedQuestions };
                    }
                    return c;
                })
            );
        };

        const updateCriteriaTitle = (criteriaId, newTitle) => {
            setCriteriaList(
                criteriaList.map((c) => (c.id === criteriaId ? { ...c, title: newTitle } : c))
            );
        };

        const addQuestion = (criteriaId) => {
            setCriteriaList(
                criteriaList.map((c) => {
                    if (c.id === criteriaId) {
                        return { ...c, questions: [...c.questions, { text: "" }] };
                    }
                    return c;
                })
            );
        };

        const removeQuestion = async (criteriaId, index) => {
            const criteria = criteriaList.find((c) => c.id === criteriaId);
            const question = criteria.questions[index];

            setDeletedQuestions((prev) => [...prev, { criteriaId, index, question }]);

            if (question.id) {
                try {
                    await axios.delete(`/questions/${question.id}`);
                } catch (error) {
                    console.error("Error deleting question:", error);
                }
            }

            setCriteriaList(
                criteriaList.map((c) => {
                    if (c.id === criteriaId) {
                        const updatedQuestions = c.questions.filter((_, i) => i !== index);
                        return { ...c, questions: updatedQuestions };
                    }
                    return c;
                })
            );

            setNotification({ type: "warning", message: "Question deleted. You can undo." });
            setTimeout(() => setNotification(null), 5000);
        };

        const handleUndoQuestion = async () => {
            if (deletedQuestions.length === 0) return;

            const latest = deletedQuestions[deletedQuestions.length - 1];
            const { criteriaId, index, question } = latest;

            if (question.id) {
                try {
                    await axios.post(`/questions/${question.id}/restore`);
                } catch (err) {
                    console.error("Failed to restore question:", err);
                }
            }

            setCriteriaList(
                criteriaList.map((c) => {
                    if (c.id === criteriaId) {
                        const updated = [...c.questions];
                        updated.splice(index, 0, question);
                        return { ...c, questions: updated };
                    }
                    return c;
                })
            );

            setDeletedQuestions((prev) => prev.slice(0, -1));
            setNotification({ type: "success", message: "Last deleted question restored." });
            setTimeout(() => setNotification(null), 3000);
        };

        const handleNewCriteriaChange = (e) => setNewCriteria({ ...newCriteria, title: e.target.value });

        const handleNewQuestionChange = (index, value) => {
            const updated = [...newCriteria.questions];
            updated[index] = { text: value };
            setNewCriteria({ ...newCriteria, questions: updated });
        };

        const addNewQuestionField = () => setNewCriteria({
            ...newCriteria,
            questions: [...newCriteria.questions, { text: "" }],
        });

        const saveNewCriteria = async () => {
            try {
                const response = await axios.post("/criteria", {
                    title: newCriteria.title,
                    recommendation: null,
                    suggestion: null,
                });
                const newCriteriaId = response.data.id;

                // Save questions
                for (const q of newCriteria.questions) {
                    await axios.post("/questions", { criteria_id: newCriteriaId, text: q.text });
                }

                setCriteriaList([...criteriaList, { id: newCriteriaId, title: newCriteria.title, questions: newCriteria.questions }]);
                router.visit(window.location.pathname);
                setNewCriteria({ title: "", questions: [] });
                setAddingCriteria(false);
            } catch (error) {
                console.error("Error saving new criteria:", error);
            }
        };

        const saveQuestions = async (criteriaId) => {
            const criteria = criteriaList.find((c) => c.id === criteriaId);
            const unsavedQuestions = criteria.questions.filter(q => !q.id && q.text.trim() !== "").map(q => q.text);

            if (unsavedQuestions.length === 0) return;

            try {
                const response = await axios.post(`/criteria/${criteriaId}/questions`, { questions: unsavedQuestions });
                const savedQuestions = response.data.questions;

                const updatedQuestions = criteria.questions.map((q) => {
                    if (!q.id && q.text.trim() !== "") return savedQuestions.shift();
                    return q;
                });

                setCriteriaList(criteriaList.map((c) => (c.id === criteriaId ? { ...c, questions: updatedQuestions } : c)));
                setNotification({ type: "success", message: "Questions saved successfully!" });
            } catch (error) {
                console.error(error);
                setNotification({ type: "error", message: "Failed to save questions." });
            }
            setTimeout(() => setNotification(null), 3000);
        };

        const saveEditedQuestions = async (criteriaId) => {
            const criteria = criteriaList.find((c) => c.id === criteriaId);
            try {
                for (const q of criteria.questions) {
                    if (q.id && q.text.trim() !== "") await axios.put(`/questions/${q.id}`, { text: q.text });
                }
                setNotification({ type: "success", message: "Changes saved!" });
            } catch (err) {
                console.error(err);
                setNotification({ type: "error", message: "Error saving changes." });
            }
            setTimeout(() => setNotification(null), 3000);
        };

        return (
            <>
                <Head title="Questionnaire Criteria" />
                <div className="relative p-6 space-y-6">
                    {notification && (
                        <div className={`fixed top-4 right-4 px-4 py-2 rounded shadow-lg text-white z-50 transition-all duration-300 ${notification.type === "success" ? "bg-green-500" : notification.type === "warning" ? "bg-yellow-500" : "bg-red-500"}`}>
                            {notification.message}
                            {deletedQuestions.length > 0 && (
                                <Button variant="ghost" size="sm" className="ml-4 text-white underline" onClick={handleUndoQuestion}>Undo</Button>
                            )}
                        </div>
                    )}

                    <div className="flex items-center justify-between mb-4">
                        <h1 className="text-2xl font-bold text-blue-800">Evaluation Questionnaire Builder</h1>
                        <div className="flex gap-2">
                            <Button variant={editMode ? "default" : "outline"} onClick={() => setEditMode(!editMode)}>
                                {editMode ? "Exit Edit Mode" : "Enable Edit Mode"}
                            </Button>
                            <Button onClick={() => router.visit("/guidance/questionnaireform")}>Edit Order</Button>
                        </div>
                    </div>

                    {criteriaList.map((criteria) => (
                        <Card key={criteria.id}>
                            <CardHeader>
                                <Input
                                    type="text"
                                    value={criteria.title}
                                    readOnly={!editMode}
                                    onChange={(e) => updateCriteriaTitle(criteria.id, e.target.value)}
                                    className="px-4 py-2 text-lg font-bold text-gray-900 bg-blue-100 border-none dark:bg-blue-900 dark:text-white rounded-t-md focus-visible:ring-0"
                                />
                            </CardHeader>
                            <CardContent className="pt-4 space-y-2">
                                {criteria.questions.map((question, qIdx) => (
                                    <div key={qIdx} className="flex items-center gap-2">
                                        <Input
                                            type="text"
                                            placeholder={`Question ${qIdx + 1}`}
                                            value={question.text}
                                            readOnly={!editMode && !!question.id}
                                            onChange={(e) => updateQuestion(criteria.id, qIdx, e.target.value)}
                                        />
                                        {editMode && (
                                            <Button type="button" variant="ghost" onClick={() => removeQuestion(criteria.id, qIdx)}>
                                                <X className="w-4 h-4" />
                                            </Button>
                                        )}
                                    </div>
                                ))}
                                <div className="flex justify-between gap-2">
                                    {!editMode && (
                                        <Button type="button" variant="outline" onClick={() => addQuestion(criteria.id)}>Add Question</Button>
                                    )}
                                    {criteria.questions.some(q => !q.id && q.text.trim() !== "") && (
                                        <Button type="button" onClick={() => saveQuestions(criteria.id)}>Save New</Button>
                                    )}
                                    {editMode && (
                                        <Button type="button" variant="secondary" onClick={() => saveEditedQuestions(criteria.id)}>Save Changes</Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}

                    {addingCriteria && (
                        <Card>
                            <CardHeader>
                                <Input type="text" placeholder="New Criteria Title" value={newCriteria.title} onChange={handleNewCriteriaChange} />
                            </CardHeader>
                            <CardContent className="pt-4 space-y-4">
                                {newCriteria.questions.map((question, index) => (
                                    <div key={index} className="flex items-center gap-2">
                                        <Input type="text" placeholder={`Question ${index + 1}`} value={question.text} onChange={(e) => handleNewQuestionChange(index, e.target.value)} />
                                        <Button type="button" variant="ghost" onClick={() => {
                                            const updated = newCriteria.questions.filter((_, i) => i !== index);
                                            setNewCriteria({ ...newCriteria, questions: updated });
                                        }}>
                                            <X className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ))}
                                {newCriteria.id && (
                                    <Button variant="outline" onClick={addNewQuestionField}>Add Question</Button>
                                )}
                                <div className="flex justify-end gap-2 pt-4">
                                    <Button variant="secondary" onClick={() => setAddingCriteria(false)}>Cancel</Button>
                                    <Button onClick={saveNewCriteria}>Save</Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {!addingCriteria && (
                        <div className="flex justify-center">
                            <Button onClick={() => setAddingCriteria(true)} className="mt-4" variant="secondary">Add New Criteria</Button>
                        </div>
                    )}
                </div>
            </>
        );
    }

    Questionnaire.layout = (page) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;
