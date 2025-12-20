import React, { useState } from "react";
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
import {
  Card, CardHeader, CardContent
} from "@/Components/ui/card";
import { Button } from "@/Components/ui/button";


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
    respondentDetails,
    detailedAnswers = []
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


    const [showEvaluators, setShowEvaluators] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState(null);

    const filteredStudentAnswers = selectedStudent
        ? detailedAnswers.filter(a => a.first_name === selectedStudent.first_name)
        : [];

    const studentFeedback = selectedStudent
        ? feedback.find(f => f.student_subject_id === selectedStudent.student_subject_id) || {}
        : {};


    const groupedByCriteria = detailedAnswers.reduce((acc, answer) => {
    const criteriaId = answer.criteria_id;
    if (!acc[criteriaId]) {
        acc[criteriaId] = {
            id: criteriaId,
            title: answer.criteria_title,
            questions: [],
        };
    }

    // Only push question if it doesn't already exist
    if (!acc[criteriaId].questions.some(q => q.question_id === answer.question_id)) {
        acc[criteriaId].questions.push({
            question_id: answer.question_id,
            question_text: answer.question_text,
        });
    }

    return acc;
}, {});

const criteriaArray = Object.values(groupedByCriteria);



    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Evaluation Results" />

            <div className="px-6 py-8 mx-auto space-y-8 max-w-7xl">
                <button
                    onClick={() => window.history.back()}
                    className="inline-flex items-center px-4 py-2 mb-4 text-sm font-medium text-gray-800 bg-gray-200 rounded-md shadow dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 dark:text-white"
                >
                    ← Back
                </button>

                {/* Header Section */}
                <div className="relative flex items-center justify-between p-4 border rounded-md">
                    <div className="absolute left-4">
                        <img src={logo} alt="OCC Logo" className="w-auto h-16" />
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
                <div className="flex justify-between w-full px-4 pt-4 text-sm border-t">
                    <div>
                        <strong>Name: </strong>{faculty.first_name} {faculty.last_name}
                    </div>
                    <div>
                        <strong>Subject:</strong> {subject.subject_code}- {subject.descriptive_title}
                    </div>
                </div>

                <div className="overflow-hidden bg-white border border-gray-200 shadow-md dark:bg-gray-900 rounded-xl dark:border-gray-700">
                    <table className="w-full text-sm text-gray-800 dark:text-gray-200">
                        <thead className="text-xs text-left text-gray-700 uppercase bg-gray-200 dark:bg-gray-800 dark:text-gray-300">
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
                    <div className="italic text-gray-500">No evaluation data available.</div>
                ) : (
                    criteria.map((c) => (
                        <div
                            key={c.criteria_id}
                            className="p-6 space-y-4 bg-white border border-gray-200 shadow-md dark:bg-gray-900 rounded-xl dark:border-gray-700"
                        >
                            <h2 className="pb-1 text-lg font-semibold text-gray-800 border-b border-gray-300 dark:text-white dark:border-gray-600">
                                {c.criteria_title}
                            </h2>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-gray-700 table-auto dark:text-gray-200">
                                    <thead className="text-left bg-gray-100 dark:bg-gray-800">
                                        <tr>
                                            <th className="px-4 py-2 border dark:border-gray-700">Question</th>
                                            <th className="px-4 py-2 text-center border dark:border-gray-700">Score</th>
                                            <th className="px-4 py-2 text-center border dark:border-gray-700">Description</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {c.questions.map((q) => {
                                            const rating = getRatingInfo(q.average);
                                            return (
                                                <tr key={q.question_id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                                    <td className="px-4 py-2 border dark:border-gray-700">{q.question_text}</td>
                                                    <td className="px-4 py-2 text-center border dark:border-gray-700">{rating.score}</td>
                                                    <td className="px-4 py-2 text-center border dark:border-gray-700">{rating.description}</td>
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
                <div className="flex items-center justify-between p-5 shadow-md bg-gradient-to-r from-purple-100 to-purple-200 dark:from-gray-800 dark:to-gray-700 rounded-xl">
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
                <div className="grid gap-6 md:grid-cols-2">

                    {/* Table */}
                    <div className="p-6 bg-white border border-gray-200 shadow-md dark:bg-gray-900 rounded-xl dark:border-gray-700">
                        <h2 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white">Mean Per Category</h2>
                        <table className="w-full text-sm text-gray-700 border dark:text-gray-200">
                            <thead className="bg-gray-100 dark:bg-gray-800">
                                <tr>
                                    <th className="px-3 py-2 text-left border dark:border-gray-700">Criteria</th>
                                    <th className="px-3 py-2 text-center border dark:border-gray-700">Mean</th>
                                    <th className="px-3 py-2 text-center border dark:border-gray-700">Description</th>
                                </tr>
                            </thead>
                            <tbody>
                                {criteria.map((c, idx) => {
                                    const rating = getRatingInfo(c.average);
                                    return (
                                        <tr key={idx} className={idx % 2 === 0 ? "bg-blue-50 dark:bg-gray-800" : ""}>
                                            <td className="px-3 py-2 border dark:border-gray-700">{c.criteria_title}</td>
                                            <td className="px-3 py-2 font-medium text-center border dark:border-gray-700">{c.average}</td>
                                            <td className="px-3 py-2 text-center border dark:border-gray-700">{rating.description}</td>
                                        </tr>
                                    );
                                })}
                                <tr className="font-semibold bg-gray-50 dark:bg-gray-800">
                                    <td className="px-3 py-2 text-red-600 border dark:border-gray-700">Overall Average:</td>
                                    <td className="px-3 py-2 text-center text-green-600 border dark:border-gray-700">{overallAverage}</td>
                                    <td className="px-3 py-2 text-center text-green-600 border dark:border-gray-700">
                                        {getRatingInfo(overallAverage).description}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Pie Chart */}
                    <div className="p-6 bg-white border border-gray-200 shadow-md dark:bg-gray-900 rounded-xl dark:border-gray-700">
                        <h2 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white">Category Distribution</h2>


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
                        className="p-6 mt-6 text-center transition duration-200 bg-white border border-gray-200 shadow-md cursor-pointer dark:bg-gray-900 rounded-xl dark:border-gray-700 hover:shadow-lg"
                        onClick={() => setShowEvaluators(true)}
                    >
                        <h2 className="mb-1 text-lg font-semibold text-gray-800 dark:text-white">Total Respondents</h2>
                        <p className="text-4xl font-bold text-purple-600 dark:text-purple-400">{totalRespondents} / {totalStudentsHandled}</p>
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Click to view evaluator list</p>
                    </div>

                </div>

                {/* Feedback: Strengths & Weaknesses */}
                {(strengthsList.length > 0 || weaknessesList.length > 0) && (
                    <div className="grid gap-6 mt-10 md:grid-cols-2">
                        {/* Strengths */}
                        <div className="p-6 bg-white border border-green-300 shadow-md dark:bg-gray-900 rounded-xl dark:border-green-600">
                            <h2 className="pb-1 mb-4 text-lg font-semibold text-green-700 border-b-2 border-green-400 dark:text-green-400">
                                Strengths
                            </h2>
                            {strengthsList.length === 0 ? (
                                <p className="italic text-gray-500">No strengths provided.</p>
                            ) : (
                                <ul className="space-y-2 text-gray-800 list-disc list-inside dark:text-gray-200">
                                    {strengthsList.map((item, idx) => (
                                        <li key={idx}>{item}</li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        {/* Weaknesses */}
                        <div className="p-6 bg-white border border-red-300 shadow-md dark:bg-gray-900 rounded-xl dark:border-red-600">
                            <h2 className="pb-1 mb-4 text-lg font-semibold text-red-700 border-b-2 border-red-400 dark:text-red-400">
                                Weaknesses
                            </h2>
                            {weaknessesList.length === 0 ? (
                                <p className="italic text-gray-500">No weaknesses provided.</p>
                            ) : (
                                <ul className="space-y-2 text-gray-800 list-disc list-inside dark:text-gray-200">
                                    {weaknessesList.map((item, idx) => (
                                        <li key={idx}>{item}</li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Evaluator List Modal */}
            {showEvaluators && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="w-full max-w-lg p-6 bg-white rounded-lg shadow-lg dark:bg-gray-900">
                        <h2 className="mb-4 text-xl font-bold text-center text-gray-800 dark:text-white">
                            Evaluator List ({respondentDetails.length})
                        </h2>

                        <div className="overflow-y-auto border rounded-lg max-h-80">
                            <table className="w-full text-sm text-left text-gray-700 dark:text-gray-200">
                                <thead className="bg-gray-200 dark:bg-gray-800">
                                    <tr>
                                        <th className="px-3 py-2 border">Name</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {respondentDetails.map((s, idx) => (
                                        <tr
                                            key={idx}
                                            className="hover:bg-gray-100 dark:hover:bg-gray-800"
                                        >
                                            <td
                                                className="px-3 py-2 text-blue-600 border cursor-pointer hover:underline"
                                                onClick={() => {
                                                    setSelectedStudent(s);
                                                    setShowPreview(true);
                                                }}
                                            >
                                                {s.first_name} {s.last_name}
                                            </td>

                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <button
                            onClick={() => setShowEvaluators(false)}
                            className="w-full px-4 py-2 mt-5 text-white bg-purple-600 rounded-lg hover:bg-purple-700"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}

{showPreview && selectedStudent && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
    <Card className="w-full max-w-4xl p-6 bg-white rounded-lg shadow-lg dark:bg-gray-900 dark:text-white">
      <CardHeader className="pb-2 border-b dark:border-gray-700">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
          Answers of {selectedStudent.anonymous
            ? selectedStudent.first_name // Pseudo-ID
            : `${selectedStudent.first_name} ${selectedStudent.last_name}`}
        </h2>
      </CardHeader>

      <CardContent className="pt-4 space-y-4 max-h-[80vh] overflow-y-auto">
        {criteriaArray.map((c) => {
          // Map each question for this criteria and attach the selected student's rating
          const studentQuestions = c.questions.map((q) => {
            const studentAnswer = detailedAnswers.find(
              (a) =>
                a.student_subject_id === selectedStudent.student_subject_id &&
                a.question_id === q.question_id
            )?.rating;

            return { ...q, rating: studentAnswer };
          });

          return (
            <Card key={c.id} className="border dark:border-gray-700">
              <CardHeader className="px-4 py-2 space-y-2 bg-gray-100 rounded-t dark:bg-gray-800">
                <h3 className="text-lg font-bold">{c.title}</h3>
                <div className="grid grid-cols-[1fr_repeat(5,_4rem)] items-center bg-gray-200 dark:bg-gray-700 rounded px-2 py-1 text-sm font-semibold">
                  <span></span>
                  {[5, 4, 3, 2, 1].map((num) => (
                    <span key={num} className="text-center">{num}</span>
                  ))}
                </div>
              </CardHeader>

              <CardContent className="pt-4">
                {studentQuestions.map((q, index) => (
                  <div
                    key={q.question_id}
                    className="grid grid-cols-[1fr_repeat(5,_4rem)] items-center border-b dark:border-gray-600 py-3"
                  >
                    <p className="pl-2 font-medium">{index + 1}. {q.question_text}</p>
                    {[5, 4, 3, 2, 1].map((opt) => (
                      <div key={opt} className="flex justify-center px-2">
                        <input
                          type="radio"
                          value={opt}
                          checked={q.rating === opt}
                          disabled
                        />
                      </div>
                    ))}
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}

        {/* Strengths & Weaknesses */}
        <div className="flex flex-col gap-6 mt-4 md:flex-row">
          <div className="w-full">
            <label className="block mb-2 font-medium">Strengths</label>
            <textarea
              className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-600"
              rows="3"
              value={studentFeedback.strengths || ""}
              disabled
            />
          </div>
          <div className="w-full">
            <label className="block mb-2 font-medium">Weaknesses</label>
            <textarea
              className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-600"
              rows="3"
              value={studentFeedback.weaknesses || ""}
              disabled
            />
          </div>
        </div>

        <Button
          className="w-full px-4 py-2 mt-5 text-white bg-purple-600 rounded-lg hover:bg-purple-700 dark:hover:bg-purple-500"
          onClick={() => setShowPreview(false)}
        >
          Close
        </Button>
      </CardContent>
    </Card>
  </div>
)}



        </AuthenticatedLayout>
    );
}
