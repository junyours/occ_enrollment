import { usePage, router, useForm } from "@inertiajs/react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/Components/ui/card";
import { Button } from "@/Components/ui/button";
import { PageTitle } from "@/Components/ui/PageTitle";
import React, { useState } from "react";

const UnknownKeywords = () => {

    const { unknownKeywords, categories, languages, mode = "pending" } = usePage().props;
    const isRejected = mode === "rejected";

    const destroy = (id) => {
    router.delete(route("unknown-keywords.destroy", id), {
        preserveScroll: true,
    });
    };

    const [selected, setSelected] = useState(null);

    const form = useForm({
        feedback_category_id: "",
        language_id: "",
        type: "weakness",
        sentiment: "negative",
    });

    /* ---------------- APPROVE ---------------- */

    const approve = (e) => {
        e.preventDefault();

        router.post(
            route("unknown-keywords.approve", selected.id),
            form.data,
            {
                onSuccess: () => {
                    setSelected(null);
                    form.reset();
                },
                onError: (err) => console.log(err),
            }
        );
    };

    /* ---------------- REJECT ---------------- */

    const reject = (id) => {
        router.post(route("unknown-keywords.reject", id));
    };


    return (
        <div className="space-y-4">

            <PageTitle align="center">
                Unknown Keywords Review
            </PageTitle>

            <div className="flex gap-2">
                <Button
                variant={!isRejected ? "default" : "outline"}
                onClick={() => router.get(route("unknown-keywords.index"))}
                >
                Pending
                </Button>
                <Button
                variant={isRejected ? "default" : "outline"}
                onClick={() => router.get(route("unknown-keywords.rejected"))}
                >
                Rejected
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Detected New Words</CardTitle>
                </CardHeader>

                <CardContent>
                    {unknownKeywords.map(word => (
                        <div key={word.id} className="flex justify-between py-3 border-b">
                            <div>
                                <p className="font-medium">{word.term}</p>
                                <p className="text-sm text-gray-500">
                                    Used {word.count} times
                                </p>
                            </div>

                            <div className="space-x-2">
                                 <Button
                                    size="sm"
                                    onClick={() => {
                                    setSelected(word);
                                    form.reset();
                                    }}
                                >
                                    Approve
                                </Button>

                                 {!isRejected && (
                                    <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => reject(word.id)}
                                    >
                                    Reject
                                    </Button>
                                )}

                                {isRejected && (
                                    <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => destroy(word.id)}
                                    >
                                    Delete
                                    </Button>
                                )}
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>

            {/* ================= APPROVE MODAL ================= */}

            {selected && (
                <div className="fixed inset-0 flex items-center justify-center bg-black/40">
                    <div className="bg-white p-6 rounded-xl w-[420px] space-y-3">

                        <h2 className="font-semibold">
                            Approve: {selected.term}
                        </h2>

                        <form onSubmit={approve} className="space-y-3">

                            <select
                                className="w-full p-2 border rounded"
                                value={form.data.feedback_category_id}
                                onChange={(e) => form.setData("feedback_category_id", e.target.value)}
                                >
                                <option value="">Category</option>
                                {categories.map((c) => (
                                    <option key={c.id} value={c.id}>
                                    {c.name}
                                    </option>
                                ))}
                                </select>

                                <select
                                className="w-full p-2 border rounded"
                                value={form.data.language_id}
                                onChange={(e) => form.setData("language_id", e.target.value)}
                                >
                                <option value="">Language</option>
                                {languages.map((l) => (
                                    <option key={l.id} value={l.id}>
                                    {l.name}
                                    </option>
                                ))}
                                </select>

                                <select
                                className="w-full p-2 border rounded"
                                value={form.data.type}
                                onChange={(e) => form.setData("type", e.target.value)}
                                >
                                <option value="strength">Strength</option>
                                <option value="weakness">Weakness</option>
                                </select>

                                <select
                                className="w-full p-2 border rounded"
                                value={form.data.sentiment}
                                onChange={(e) => form.setData("sentiment", e.target.value)}
                                >
                                <option value="positive">Positive</option>
                                <option value="neutral">Neutral</option>
                                <option value="negative">Negative</option>
                                </select>

                            <div className="flex justify-end gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setSelected(null)}
                                >
                                    Cancel
                                </Button>

                                <Button type="submit">
                                    Approve
                                </Button>
                            </div>

                        </form>
                    </div>
                </div>
            )}

        </div>
    );
};

UnknownKeywords.layout = page =>
    <AuthenticatedLayout>{page}</AuthenticatedLayout>;

export default UnknownKeywords;
