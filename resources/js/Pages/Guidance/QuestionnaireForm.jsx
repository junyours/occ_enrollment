import React, { useState } from "react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head, router } from "@inertiajs/react";
import {
    DndContext,
    closestCenter,
    PointerSensor,
    useSensor,
    useSensors,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    useSortable,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

function SortableItem({ id, children, disabled }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id, disabled });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        cursor: disabled ? "default" : "grab",
        backgroundColor: isDragging ? "#dbeafe" : undefined,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            title={!disabled ? "Drag me" : undefined}
            {...(disabled ? {} : attributes)}
            {...(disabled ? {} : listeners)}
        >
            {children}
        </div>
    );
}

export default function QuestionnaireForm({ criteria = [] }) {
    const [criteriaList, setCriteriaList] = useState(criteria);
    const [editingOrder, setEditingOrder] = useState(false);
    const sensors = useSensors(useSensor(PointerSensor));

    const handleCriteriaDragEnd = (event) => {
        const { active, over } = event;
        if (active.id !== over.id) {
            const oldIndex = criteriaList.findIndex((c) => c.id === active.id);
            const newIndex = criteriaList.findIndex((c) => c.id === over.id);
            setCriteriaList(arrayMove(criteriaList, oldIndex, newIndex));
        }
    };

    const handleQuestionDragEnd = (criteriaId, event) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        setCriteriaList((prevList) => {
            return prevList.map((c) => {
                if (c.id !== criteriaId) return c;

                const oldIndex = c.questions.findIndex(
                    (q) => q.id === active.id
                );
                const newIndex = c.questions.findIndex((q) => q.id === over.id);
                const updatedQuestions = arrayMove(
                    c.questions,
                    oldIndex,
                    newIndex
                );
                return { ...c, questions: updatedQuestions };
            });
        });
    };

    const updateRating = (criteriaId, questionIndex, value) => {
        setCriteriaList(
            criteriaList.map((c) => {
                if (c.id === criteriaId) {
                    const updatedQuestions = [...c.questions];
                    updatedQuestions[questionIndex] = {
                        ...updatedQuestions[questionIndex],
                        rating: value,
                    };
                    return { ...c, questions: updatedQuestions };
                }
                return c;
            })
        );
    };

    const saveArrangementToServer = () => {
        const payload = {
            criteria: criteriaList.map((c) => ({
                id: c.id,
                question_ids: c.questions.map((q) => q.id),
            })),
        };

        router.post("/questionnaire/save-order", payload, {
            preserveScroll: true,
            onSuccess: () => {
                console.log("Order saved!");
            },
        });
    };

    return (
        <>
            <Head title="Evaluation Questionnaire" />
            <div className="p-6 space-y-6 max-w-5xl mx-auto">
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => window.history.back()}
                            className="px-3 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                        >
                            ← Back
                        </button>
                    </div>
                    {!editingOrder ? (
                        <button
                            onClick={() => setEditingOrder(true)}
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                            Edit Arrangement
                        </button>
                    ) : (
                        <button
                            onClick={() => {
                                setEditingOrder(false);
                                saveArrangementToServer();
                            }}
                            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                        >
                            Done Editing
                        </button>
                    )}
                </div>
                <h1 className="text-center text-2xl font-bold text-blue-800">
                    Evaluation Form
                </h1>
                <div className="bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 p-4 rounded shadow">
                    <h2 className="font-medium text-base text-blue-700 mb-2">
                        Rating Legend:
                    </h2>
                    <div className="font-bold grid grid-cols-5 gap-4 text-sm text-gray-800 dark:text-gray-200">
                        <span className="text-center">5 - Strongly Agree</span>
                        <span className="text-center">4 - Agree</span>
                        <span className="text-center">3 - Neutral</span>
                        <span className="text-center">2 - Disagree</span>
                        <span className="text-center">1 - Strongly Disagree</span>
                    </div>
                </div>

                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={editingOrder ? handleCriteriaDragEnd : undefined}
                >
                    <SortableContext
                        items={criteriaList.map((c) => c.id)}
                        strategy={verticalListSortingStrategy}
                    >
                        {criteriaList.map((criteria) => (
                            <SortableItem
                                key={criteria.id}
                                id={criteria.id}
                                disabled={!editingOrder}
                            >
                                <div className="border rounded-lg p-6 mb-6 bg-white dark:bg-gray-800 shadow-md">
                                    <div className="flex justify-between items-center mb-4">
                                        <h2 className="text-xl font-semibold text-blue-600 flex items-center gap-2">
                                            {editingOrder && (
                                                <span className="text-sm text-blue-400">
                                                    ⇅
                                                </span>
                                            )}
                                            {criteria.title}
                                        </h2>
                                        <div className="grid grid-cols-5 gap-4 text-xs text-gray-500 w-1/3 justify-end text-center">
                                            {[5, 4, 3, 2, 1].map((num) => (
                                                <span
                                                    key={num}
                                                    className="w-6 text-center"
                                                >
                                                    {num}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    <DndContext
                                        sensors={sensors}
                                        collisionDetection={closestCenter}
                                        onDragEnd={(event) =>
                                            editingOrder
                                                ? handleQuestionDragEnd(
                                                      criteria.id,
                                                      event
                                                  )
                                                : undefined
                                        }
                                    >
                                        <SortableContext
                                            items={criteria.questions.map(
                                                (q) => q.id
                                            )}
                                            strategy={
                                                verticalListSortingStrategy
                                            }
                                        >
                                            <div className="space-y-2">
                                                {criteria.questions.map(
                                                    (question, index) => (
                                                        <SortableItem
                                                            key={question.id}
                                                            id={question.id}
                                                            disabled={
                                                                !editingOrder
                                                            }
                                                        >
                                                            <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-900 px-4 py-2 rounded-md shadow-sm">
                                                                <div className="text-gray-700 dark:text-gray-100 text-sm font-medium w-2/3 pr-4 flex items-center gap-2">
                                                                    {editingOrder && (
                                                                        <span className="text-xs text-blue-400">
                                                                            ⇅
                                                                        </span>
                                                                    )}
                                                                    {
                                                                        question.text
                                                                    }
                                                                </div>
                                                                <div className="grid grid-cols-5 gap-4 w-1/3 justify-end">
                                                                    {[
                                                                        5, 4, 3,
                                                                        2, 1,
                                                                    ].map(
                                                                        (
                                                                            num
                                                                        ) => (
                                                                            <label
                                                                                key={
                                                                                    num
                                                                                }
                                                                                className="flex flex-col items-center text-xs text-gray-700 dark:text-gray-200"
                                                                            >
                                                                                <input
                                                                                    type="radio"
                                                                                    name={`rating-${criteria.id}-${index}`}
                                                                                    value={
                                                                                        num
                                                                                    }
                                                                                    className="form-radio text-blue-600 focus:ring-blue-500"
                                                                                    checked={
                                                                                        question.rating ===
                                                                                        num
                                                                                    }
                                                                                    onChange={() =>
                                                                                        updateRating(
                                                                                            criteria.id,
                                                                                            index,
                                                                                            num
                                                                                        )
                                                                                    }
                                                                                />
                                                                            </label>
                                                                        )
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </SortableItem>
                                                    )
                                                )}
                                            </div>
                                        </SortableContext>
                                    </DndContext>
                                </div>
                            </SortableItem>
                        ))}
                    </SortableContext>
                </DndContext>
            </div>
        </>
    );
}

QuestionnaireForm.layout = (page) => (
    <AuthenticatedLayout>{page}</AuthenticatedLayout>
);
