import React from "react";
import FacultyFesReport from "@/Pages/Guidance/FesFacultyResult/FacultyFesReport";

export default function EvalFacultyFesReport({ schoolYears = [] }) {
    return (
        <FacultyFesReport
            schoolYears={schoolYears}
            subjectsRoute="eval.facultySubjects"
        />
    );
}
