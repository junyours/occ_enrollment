

import React, { useState } from "react";
import EnterGrades from "./GradingPartials/EnterGrades";
import GradeSummary from "./GradingPartials/GradeSummary";
import HowItWorks from "./GradingPartials/HowItWorks";

import { Card, CardContent } from "@/Components/ui/card";
import SegmentedTabs from "@/Components/ui/SegmentedTabs";
import SegmentedControl from "@/Components/ui/SegmentedControl";
import { Alert, AlertDescription, AlertTitle } from "@/Components/ui/alert";
import { ClipboardList, Info } from "lucide-react";
import { Badge } from "@/Components/ui/badge";


const PERIODS = [
    {
        value: "midterm",
        label: "Midterm",
    },
    {
        value: "final",
        label: "Final",
    },
];

const GRADING_TABS = [
    {
        value: "enter_grades",
        label: "Enter Grades",
    },
    {
        value: "grade_summary",
        label: "Grade Summary",
    },
    {
        value: "how_it_works",
        label: "How It Works",
    },
];


export default function Grading({ classId }) {

    return (
        <div className="flex min-h-[320px] w-full items-center justify-center p-4 sm:p-6">
            <Card className="w-full max-w-md rounded-2xl border-dashed bg-muted/20 py-0 shadow-none">
                <CardContent className="flex flex-col items-center px-6 py-10 text-center sm:px-10">
                    <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <ClipboardList
                            aria-hidden="true"
                            className="h-8 w-8"
                            strokeWidth={1.5}
                        />
                    </div>

                    <Badge
                        variant="secondary"
                        className="mb-3 gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
                    >
                        <span
                            aria-hidden="true"
                            className="h-1.5 w-1.5 rounded-full bg-primary"
                        />
                        In development
                    </Badge>

                    <h3 className="text-lg font-semibold tracking-tight text-foreground">
                        Not complete yet
                    </h3>

                    <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
                        The grading module is still being developed.
                        Please check back for updates.
                    </p>
                </CardContent>
            </Card>
        </div>
    )

    
    const [selectedPeriod, setSelectedPeriod] = useState("midterm");
    const [selectedTab, setSelectedTab] = useState("enter_grades");

    return (
        <Card>
            <CardContent className="space-y-4 pt-6">
                {/* Top controls */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <SegmentedControl
                        value={selectedPeriod}
                        onValueChange={setSelectedPeriod}
                        items={PERIODS}
                    />

                    <SegmentedTabs
                        value={selectedTab}
                        onValueChange={setSelectedTab}
                        items={GRADING_TABS}
                    />
                </div>

                {/* Content */}
                {selectedTab === "enter_grades" && (
                    <EnterGrades
                        period={selectedPeriod}
                        classId={classId}
                    />
                )}

                {selectedTab === "grade_summary" && (
                    <GradeSummary classId={classId} />
                )}

                {selectedTab === "how_it_works" && (
                    <HowItWorks />
                )}

            </CardContent>
        </Card>
    );
}