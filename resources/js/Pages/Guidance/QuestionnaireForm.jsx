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
            <div className="max-w-5xl p-6 mx-auto space-y-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => window.history.back()}
                            className="px-3 py-2 text-gray-700 bg-gray-200 rounded hover:bg-gray-300"
                        >
                            ← Back
                        </button>
                    </div>
                    {!editingOrder ? (
                        <button
                            onClick={() => setEditingOrder(true)}
                            className="px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700"
                        >
                            Edit Arrangement
                        </button>
                    ) : (
                        <button
                            onClick={() => {
                                setEditingOrder(false);
                                saveArrangementToServer();
                            }}
                            className="px-4 py-2 text-white bg-gray-500 rounded hover:bg-gray-600"
                        >
                            Done Editing
                        </button>
                    )}
                </div>
                <h1 className="text-2xl font-bold text-center text-blue-800">
                    Evaluation Form
                </h1>
                <div className="p-4 border border-blue-200 rounded shadow bg-blue-50 dark:bg-blue-900 dark:border-blue-700">
                    <h2 className="mb-2 text-base font-medium text-blue-700">
                        Rating Legend:
                    </h2>
                    <div className="grid grid-cols-5 gap-4 text-sm font-bold text-gray-800 dark:text-gray-200">
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
                                <div className="p-6 mb-6 bg-white border rounded-lg shadow-md dark:bg-gray-800">
                                    <div className="flex items-center justify-between mb-4">
                                        <h2 className="flex items-center gap-2 text-xl font-semibold text-blue-600">
                                            {editingOrder && (
                                                <span className="text-sm text-blue-400">
                                                    ⇅
                                                </span>
                                            )}
                                            {criteria.title}
                                        </h2>
                                        <div className="grid justify-end w-1/3 grid-cols-5 gap-4 text-xs text-center text-gray-500">
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
                                                            <div className="flex items-center justify-between px-4 py-2 rounded-md shadow-sm bg-gray-50 dark:bg-gray-900">
                                                                <div className="flex items-center w-2/3 gap-2 pr-4 text-sm font-medium text-gray-700 dark:text-gray-100">
                                                                    {editingOrder && (
                                                                        <span className="text-xs text-blue-400">
                                                                            ⇅
                                                                        </span>
                                                                    )}
                                                                    {
                                                                        question.text
                                                                    }
                                                                </div>
                                                                <div className="grid justify-end w-1/3 grid-cols-5 gap-4">
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
                                                                                    className="text-blue-600 form-radio focus:ring-blue-500"
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
