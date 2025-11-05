import React from "react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head } from "@inertiajs/react";
import {
    PieChart,
    Pie,
    Cell,
    Legend,
    ResponsiveContainer,
} from "recharts";
import logo from "/resources/images/OCC_LOGO.png";

// Utility function to generate a random hex color
const getRandomColor = () => {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
};

export default function FacultyEvaluationResultPage({
    auth,
    faculty,
    subject,
    evaluation, 
    criteria,
    overallAverage,
    totalRespondents,
    totalStudentsHandled,
    schoolYear,
    feedback,
}) {
    const getRatingInfo = (average) => {
        const avg = parseFloat(average);
        if (avg >= 4.21 && avg <= 5.0) {
            return {
                score: 5,
                range: "4.21 - 5.00",
                description: "Excellent",
                interpretation: "The teacher always exhibits the quality being rated.",
            };
        }
        if (avg >= 3.41 && avg <= 4.20) {
            return {
                score: 4,
                range: "3.41 - 4.20",
                description: "Very Good",
                interpretation: "The teacher most of the time exhibits the quality being rated.",
            };
        }
        if (avg >= 2.61 && avg <= 3.40) {
            return {
                score: 3,
                range: "2.61 - 3.40",
                description: "Good",
                interpretation: "The teacher sometimes exhibits the quality being rated.",
            };
        }
        if (avg >= 1.81 && avg <= 2.60) {
            return {
                score: 2,
                range: "1.81 - 2.60",
                description: "Fair",
                interpretation: "The teacher seldom exhibits the quality being rated.",
            };
        }
        if (avg >= 1.0 && avg <= 1.80) {
            return {
                score: 1,
                range: "1.00 - 1.80",
                description: "Poor",
                interpretation: "The teacher sometimes exhibits the quality being rated.",
            };
        }
        return {
            score: "-",
            range: "-",
            description: "No rating",
            interpretation: "No interpretation available.",
        };
    };

    const pieData = criteria.map((c) => ({
        name: c.criteria_title,
        value: parseFloat(c.average),
        color: getRandomColor(),
    }));

    const strengthsList = feedback
    .map(f => f.strengths?.trim())
    .filter(str => str && str !== '');

    const weaknessesList = feedback
        .map(f => f.weaknesses?.trim())
        .filter(wk => wk && wk !== '');


    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Evaluation Results" />
 
            <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
                <button
                    onClick={() => window.history.back()}
                    className="inline-flex items-center px-4 py-2 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-800 dark:text-white text-sm font-medium rounded-md shadow mb-4"
                >
                    ← Back
                </button>

                {/* Header Section */}
                <div className="border rounded-md p-4 flex items-center justify-between relative">
                    <div className="absolute left-4">
                        <img src={logo} alt="OCC Logo" className="h-16 w-auto" />
                    </div>
                    <div className="mx-auto text-center">
                        <h2 className="text-lg font-semibold text-gray-800">Summary Report</h2>
                        <p className="font-medium text-gray-700">Student’s Assessment of Faculty Teaching Performance</p>
                        <p className="font-semibold text-gray-800">
                            {schoolYear.formatted}
                        </p>

                        <p className="text-sm text-gray-600">{faculty.department?.department_name}</p>
                    </div>
                </div>

                {/* Faculty and Subject Info */}
                <div className="flex justify-between w-full text-sm pt-4 px-4 border-t">
                    <div>
                        <strong>Name: </strong>{faculty.first_name} {faculty.last_name}
                    </div>
                    <div>
                        <strong>Subject:</strong> {subject.subject_code}- {subject.descriptive_title}
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-900 shadow-md rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
                    <table className="w-full text-sm text-gray-800 dark:text-gray-200">
                        <thead className="bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-left uppercase text-xs">
                            <tr>
                                <th className="px-4 py-3">Score</th>
                                <th className="px-4 py-3">Mean Ranges</th>
                                <th className="px-4 py-3">Description</th>
                                <th className="px-4 py-3">Interpretation</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            <tr>
                                <td className="px-4 py-3">5</td>
                                <td className="px-4 py-3">4.21 - 5.00</td>
                                <td className="px-4 py-3 font-medium text-green-600 dark:text-green-400">Excellent</td>
                                <td className="px-4 py-3">The teacher always exhibits the quality being rated.</td>
                            </tr>
                            <tr>
                                <td className="px-4 py-3">4</td>
                                <td className="px-4 py-3">3.41 - 4.20</td>
                                <td className="px-4 py-3 font-medium text-blue-600 dark:text-blue-400">Very Good</td>
                                <td className="px-4 py-3">The teacher most of the time exhibits the quality being rated.</td>
                            </tr>
                            <tr>
                                <td className="px-4 py-3">3</td>
                                <td className="px-4 py-3">2.61 - 3.40</td>
                                <td className="px-4 py-3 font-medium text-yellow-600 dark:text-yellow-400">Good</td>
                                <td className="px-4 py-3">The teacher sometimes exhibits the quality being rated.</td>
                            </tr>
                            <tr>
                                <td className="px-4 py-3">2</td>
                                <td className="px-4 py-3">1.81 - 2.60</td>
                                <td className="px-4 py-3 font-medium text-orange-600 dark:text-orange-400">Fair</td>
                                <td className="px-4 py-3">The teacher seldom exhibits the quality being rated.</td>
                            </tr>
                            <tr>
                                <td className="px-4 py-3">1</td>
                                <td className="px-4 py-3">1.00 - 1.80</td>
                                <td className="px-4 py-3 font-medium text-red-600 dark:text-red-400">Poor</td>
                                <td className="px-4 py-3">The teacher sometimes exhibits the quality being rated.</td>
                            </tr>
                        </tbody>
                    </table>
                </div>


                {/* Evaluation Criteria Breakdown */}
                {criteria.length === 0 ? (
                    <div className="text-gray-500 italic">No evaluation data available.</div>
                ) : (
                    criteria.map((c) => (
                        <div
                            key={c.criteria_id}
                            className="bg-white dark:bg-gray-900 shadow-md rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-4"
                        >
                            <h2 className="text-lg font-semibold text-gray-800 dark:text-white border-b pb-1 border-gray-300 dark:border-gray-600">
                                {c.criteria_title}
                            </h2>
                            <div className="overflow-x-auto">
                                <table className="w-full table-auto text-sm text-gray-700 dark:text-gray-200">
                                    <thead className="bg-gray-100 dark:bg-gray-800 text-left">
                                        <tr>
                                            <th className="px-4 py-2 border dark:border-gray-700">Question</th>
                                            <th className="px-4 py-2 border text-center dark:border-gray-700">Score</th>
                                            <th className="px-4 py-2 border text-center dark:border-gray-700">Description</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {c.questions.map((q) => {
                                            const rating = getRatingInfo(q.average);
                                            return (
                                                <tr key={q.question_id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                                    <td className="px-4 py-2 border dark:border-gray-700">{q.question_text}</td>
                                                    <td className="px-4 py-2 border text-center dark:border-gray-700">{rating.score}</td>
                                                    <td className="px-4 py-2 border text-center dark:border-gray-700">{rating.description}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))
                )}

                {/* Overall Summary */}
                <div className="bg-gradient-to-r from-purple-100 to-purple-200 dark:from-gray-800 dark:to-gray-700 shadow-md rounded-xl p-5 flex items-center justify-between">
                    <div className="space-y-1">
                        <h2 className="text-base font-medium text-gray-800 dark:text-white">
                            Overall Evaluation
                        </h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Student Assessment Summary
                        </p>
                    </div>
                    <div className="text-4xl font-extrabold text-purple-700 dark:text-purple-300">
                        {overallAverage}
                    </div>
                </div>

                {/* Mean Per Category Table + Chart */}
                <div className="grid md:grid-cols-2 gap-6">

                    {/* Table */}
                    <div className="bg-white dark:bg-gray-900 shadow-md rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                        <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Mean Per Category</h2>
                        <table className="w-full text-sm text-gray-700 dark:text-gray-200 border">
                            <thead className="bg-gray-100 dark:bg-gray-800">
                                <tr>
                                    <th className="px-3 py-2 border dark:border-gray-700 text-left">Criteria</th>
                                    <th className="px-3 py-2 border dark:border-gray-700 text-center">Mean</th>
                                    <th className="px-3 py-2 border dark:border-gray-700 text-center">Description</th>
                                </tr>
                            </thead>
                            <tbody>
                                {criteria.map((c, idx) => {
                                    const rating = getRatingInfo(c.average);
                                    return (
                                        <tr key={idx} className={idx % 2 === 0 ? "bg-blue-50 dark:bg-gray-800" : ""}>
                                            <td className="px-3 py-2 border dark:border-gray-700">{c.criteria_title}</td>
                                            <td className="px-3 py-2 border text-center font-medium dark:border-gray-700">{c.average}</td>
                                            <td className="px-3 py-2 border text-center dark:border-gray-700">{rating.description}</td>
                                        </tr>
                                    );
                                })}
                                <tr className="bg-gray-50 dark:bg-gray-800 font-semibold">
                                    <td className="px-3 py-2 border text-red-600 dark:border-gray-700">Overall Average:</td>
                                    <td className="px-3 py-2 border text-center text-green-600 dark:border-gray-700">{overallAverage}</td>
                                    <td className="px-3 py-2 border text-center text-green-600 dark:border-gray-700">
                                        {getRatingInfo(overallAverage).description}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Pie Chart */}
                    <div className="bg-white dark:bg-gray-900 shadow-md rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                        <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Category Distribution</h2>

                        
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={100}
                                    dataKey="value"
                                    stroke="none" // ❌ removes outer border line
                                    label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                                        const RADIAN = Math.PI / 180;
                                        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                                        const x = cx + radius * Math.cos(-midAngle * RADIAN);
                                        const y = cy + radius * Math.sin(-midAngle * RADIAN);

                                        return percent > 0.05 ? ( // Hide labels for very small slices
                                            <text
                                                x={x}
                                                y={y}
                                                fill="white"
                                                textAnchor="middle"
                                                dominantBaseline="central"
                                                fontSize={12}
                                                fontWeight="bold"
                                            >
                                                {`${(percent * 100).toFixed(0)}%`}
                                            </text>
                                        ) : null;
                                    }}
                                    labelLine={false} // ❌ disables connecting lines
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Legend layout="vertical" align="right" verticalAlign="middle" />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                   

                    {/* Respondents Info */}
                    <div
                        className="bg-white dark:bg-gray-900 shadow-md rounded-xl p-6 border border-gray-200 dark:border-gray-700 text-center mt-6 cursor-pointer hover:shadow-lg transition duration-200"
                        onClick={() => setShowEvaluators(true)}
                    >
                        <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-1">Total Respondents</h2>
                        <p className="text-4xl font-bold text-purple-600 dark:text-purple-400">{totalRespondents} / {totalStudentsHandled}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Click to view evaluator list</p>
                    </div>
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    
                </div>

                {/* Feedback: Strengths & Weaknesses */}
                {(strengthsList.length > 0 || weaknessesList.length > 0) && (
                    <div className="grid md:grid-cols-2 gap-6 mt-10">
                        {/* Strengths */}
                        <div className="bg-white dark:bg-gray-900 shadow-md rounded-xl border border-green-300 dark:border-green-600 p-6">
                            <h2 className="text-lg font-semibold text-green-700 dark:text-green-400 mb-4 border-b-2 border-green-400 pb-1">
                                Strengths
                            </h2>
                            {strengthsList.length === 0 ? (
                                <p className="text-gray-500 italic">No strengths provided.</p>
                            ) : (
                                <ul className="list-disc list-inside space-y-2 text-gray-800 dark:text-gray-200">
                                    {strengthsList.map((item, idx) => (
                                        <li key={idx}>{item}</li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        {/* Weaknesses */}
                        <div className="bg-white dark:bg-gray-900 shadow-md rounded-xl border border-red-300 dark:border-red-600 p-6">
                            <h2 className="text-lg font-semibold text-red-700 dark:text-red-400 mb-4 border-b-2 border-red-400 pb-1">
                                Weaknesses
                            </h2>
                            {weaknessesList.length === 0 ? (
                                <p className="text-gray-500 italic">No weaknesses provided.</p>
                            ) : (
                                <ul className="list-disc list-inside space-y-2 text-gray-800 dark:text-gray-200">
                                    {weaknessesList.map((item, idx) => (
                                        <li key={idx}>{item}</li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                )}

            </div>
            
        </AuthenticatedLayout>
    );
}
