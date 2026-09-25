import React, { useState } from "react";
import EnterGrades from "./GradingPartials/EnterGrades";
import GradeSummary from "./GradingPartials/GradeSummary";
import HowItWorks from "./GradingPartials/HowItWorks";

import { Card, CardContent } from "@/Components/ui/card";
import SegmentedTabs from "@/Components/ui/SegmentedTabs";
import SegmentedControl from "@/Components/ui/SegmentedControl";


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