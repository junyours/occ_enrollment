import React, { useMemo, useState } from "react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head } from "@inertiajs/react";
import { PieChart, Pie, Cell, Legend, ResponsiveContainer } from "recharts";
import logo from "/resources/images/OCC_LOGO.png";
import { Card, CardHeader, CardContent } from "@/Components/ui/card";
import { Button } from "@/Components/ui/button";

/* ------------------------- Helpers ------------------------- */

const getRandomColor = () => {
  const letters = "0123456789ABCDEF";
  let color = "#";
  for (let i = 0; i < 6; i++) color += letters[Math.floor(Math.random() * 16)];
  return color;
};

const formatMean = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return "0";
  return n.toString(); // shows actual value, no forced rounding
};

const interpretationText = (isValid) =>
  isValid ? null : "Pending interpretation (needs ≥ 50% respondents)";

const getRatingInfo = (average) => {
  const avg = parseFloat(average);

  if (avg >= 4.21 && avg <= 5.0) {
    return { score: 5, range: "4.21 - 5.00", description: "Excellent", interpretation: "The teacher always exhibits the quality being rated." };
  }
  if (avg >= 3.41 && avg <= 4.20) {
    return { score: 4, range: "3.41 - 4.20", description: "Very Good", interpretation: "The teacher most of the time exhibits the quality being rated." };
  }
  if (avg >= 2.61 && avg <= 3.40) {
    return { score: 3, range: "2.61 - 3.40", description: "Good", interpretation: "The teacher sometimes exhibits the quality being rated." };
  }
  if (avg >= 1.81 && avg <= 2.60) {
    return { score: 2, range: "1.81 - 2.60", description: "Fair", interpretation: "The teacher seldom exhibits the quality being rated." };
  }
  if (avg >= 1.0 && avg <= 1.80) {
    return { score: 1, range: "1.00 - 1.80", description: "Poor", interpretation: "The teacher sometimes exhibits the quality being rated." };
  }

  return { score: "-", range: "-", description: "No rating", interpretation: "No interpretation available." };
};

const SectionCard = ({ title, className = "", children }) => (
  <div className={`p-6 bg-white border border-gray-200 shadow-md dark:bg-gray-900 rounded-xl dark:border-gray-700 ${className}`}>
    <h2 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white">{title}</h2>
    {children}
  </div>
);



/* ------------------------- Page ------------------------- */

export default function EvalfacEvaluationResult({
  auth,
  faculty,
  subject,
  evaluation,
  criteria,
  overallAverage,
  totalRespondents,
  totalStudentsHandled,
  responseRate = 0,
  isValidEvaluation = false,
  schoolYear,
  feedback,
  respondentDetails,
  detailedAnswers = [],
  analysisSummary = [],
  sentimentSummary = [],
  topWeaknessRecommendations = [],
}) {
  const [showEvaluators, setShowEvaluators] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);

  const {
    pieData,
    strengthsList,
    weaknessesList,
    criteriaArray,
    studentFeedback,
    sentimentData,
    totalAnalyzed,
    strengthCategories,
    weaknessCategories,
  } = useMemo(() => {
    const pieData = (criteria || []).map((c) => ({
      name: c.criteria_title,
      value: parseFloat(c.average),
      color: getRandomColor(),
    }));

    const strengthsList = (feedback || []).map((f) => f.strengths?.trim()).filter((str) => str);
    const weaknessesList = (feedback || []).map((f) => f.weaknesses?.trim()).filter((wk) => wk);

    const groupedByCriteria = (detailedAnswers || []).reduce((acc, answer) => {
      const criteriaId = answer.criteria_id;
      if (!acc[criteriaId]) {
        acc[criteriaId] = { id: criteriaId, title: answer.criteria_title, questions: [] };
      }
      if (!acc[criteriaId].questions.some((q) => q.question_id === answer.question_id)) {
        acc[criteriaId].questions.push({ question_id: answer.question_id, question_text: answer.question_text });
      }
      return acc;
    }, {});
    const criteriaArray = Object.values(groupedByCriteria);

    const studentFeedback =
      selectedStudent
        ? (feedback || []).find((f) => f.student_subject_id === selectedStudent.student_subject_id) || {}
        : {};

    const sentimentData = ["positive", "neutral", "negative"].map((s) => {
      const found = (sentimentSummary || []).find((x) => x.sentiment === s);
      return { name: s, value: found ? Number(found.total) : 0 };
    });
    const totalAnalyzed = sentimentData.reduce((acc, x) => acc + x.value, 0);

    const strengthCategories = (analysisSummary || []).filter((x) => x.type === "strength").sort((a, b) => b.total - a.total);
    const weaknessCategories = (analysisSummary || []).filter((x) => x.type === "weakness").sort((a, b) => b.total - a.total);

    return {
      pieData,
      strengthsList,
      weaknessesList,
      criteriaArray,
      studentFeedback,
      sentimentData,
      totalAnalyzed,
      strengthCategories,
      weaknessCategories,
    };
  }, [criteria, feedback, detailedAnswers, sentimentSummary, analysisSummary, selectedStudent]);

  return (
    <AuthenticatedLayout user={auth.user}>
      <Head title="Evaluation Results" />

      <div className="px-6 py-8 mx-auto space-y-8 max-w-7xl">
        <button
          onClick={() => window.history.back()}
          className="inline-flex items-center px-4 py-2 mb-2 text-sm font-medium text-gray-800 bg-gray-200 rounded-md shadow dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 dark:text-white"
        >
          ← Back
        </button>

        <div className="relative flex items-center justify-between p-4 border rounded-md">
          <div className="absolute left-4">
            <img src={logo} alt="OCC Logo" className="w-auto h-16" />
          </div>
          <div className="mx-auto text-center">
            <h2 className="text-lg font-semibold text-gray-800">Summary Report</h2>
            <p className="font-medium text-gray-700">Student’s Assessment of Faculty Teaching Performance</p>
            <p className="font-semibold text-gray-800">{schoolYear?.formatted}</p>
            <p className="text-sm text-gray-600">{faculty?.department?.department_name}</p>
          </div>
        </div>

        <div className="flex justify-between w-full px-4 pt-4 text-sm border-t">
          <div>
            <strong>Name: </strong>
            {faculty?.first_name} {faculty?.last_name}
          </div>
          <div>
            <strong>Subject:</strong> {subject?.subject_code}- {subject?.descriptive_title}
          </div>
        </div>

        {/* ✅ Participation Rule Banner */}
        {!isValidEvaluation && (
          <div className="p-4 text-center text-red-700 bg-red-100 border border-red-300 rounded-lg">
            <div className="font-semibold">Evaluation results are NOT yet valid.</div>
            <div>At least <strong>50%</strong> student participation is required.</div>
            <div className="mt-1">
              Current: <strong>{totalRespondents}</strong> / <strong>{totalStudentsHandled}</strong>{" "}
              (<strong>{(responseRate * 100).toFixed(1)}%</strong>)
            </div>
          </div>
        )}

        {/* Rating Legend */}
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
              {[
                [5, "4.21 - 5.00", "Excellent", "The teacher always exhibits the quality being rated.", "text-green-600 dark:text-green-400"],
                [4, "3.41 - 4.20", "Very Good", "The teacher most of the time exhibits the quality being rated.", "text-blue-600 dark:text-blue-400"],
                [3, "2.61 - 3.40", "Good", "The teacher sometimes exhibits the quality being rated.", "text-yellow-600 dark:text-yellow-400"],
                [2, "1.81 - 2.60", "Fair", "The teacher seldom exhibits the quality being rated.", "text-orange-600 dark:text-orange-400"],
                [1, "1.00 - 1.80", "Poor", "The teacher sometimes exhibits the quality being rated.", "text-red-600 dark:text-red-400"],
              ].map(([score, range, desc, interp, color]) => (
                <tr key={score}>
                  <td className="px-4 py-3">{score}</td>
                  <td className="px-4 py-3">{range}</td>
                  <td className={`px-4 py-3 font-medium ${color}`}>{desc}</td>
                  <td className="px-4 py-3">{interp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Criteria Breakdown */}
        {criteria?.length === 0 ? (
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

                          {/* ✅ show actual mean; if not valid evaluation show N/A */}
                          <td className="px-4 py-2 text-center border dark:border-gray-700">
                            {isValidEvaluation ? formatMean(q.average) : "N/A"}
                          </td>

                          {/* <td className="px-4 py-2 text-center border dark:border-gray-700">
                            {formatMean(q.average)}
                            </td> */}

                          {/* ✅ show description only if valid */}
                          <td className="px-4 py-2 text-center border dark:border-gray-700">
                            {isValidEvaluation ? rating.description : "Insufficient responses"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* ✅ criteria mean row (optional) */}
              <div className="flex justify-end pt-2 text-sm">
                <span className="mr-2 font-semibold">Criteria Mean:</span>
                <span className="font-bold text-purple-700">
                  {isValidEvaluation ? formatMean(c.average) : "N/A"}
                </span>
              </div>
            </div>
          ))
        )}

        {/* Overall Summary */}
        <div className="flex items-center justify-between p-5 shadow-md bg-gradient-to-r from-purple-100 to-purple-200 dark:from-gray-800 dark:to-gray-700 rounded-xl">
          <div className="space-y-1">
            <h2 className="text-base font-medium text-gray-800 dark:text-white">Overall Evaluation</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">Student Assessment Summary</p>
          </div>

          <div className="text-4xl font-extrabold text-purple-700 dark:text-purple-300">
            {isValidEvaluation ? formatMean(overallAverage) : "N/A"}
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <SectionCard title="Mean Per Category">
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
                      <td className="px-3 py-2 font-medium text-center border dark:border-gray-700">
                        {isValidEvaluation ? formatMean(c.average) : "N/A"}
                      </td>
                      <td className="px-3 py-2 text-center border dark:border-gray-700">
                        {isValidEvaluation ? rating.description : "Insufficient responses"}
                      </td>
                    </tr>
                  );
                })}

                <tr className="font-semibold bg-gray-50 dark:bg-gray-800">
                  <td className="px-3 py-2 text-red-600 border dark:border-gray-700">Overall Average:</td>
                  <td className="px-3 py-2 text-center text-green-600 border dark:border-gray-700">
                    {isValidEvaluation ? formatMean(overallAverage) : "N/A"}
                  </td>
                  <td className="px-3 py-2 text-center text-green-600 border dark:border-gray-700">
                    {isValidEvaluation ? getRatingInfo(overallAverage).description : "Insufficient responses"}
                  </td>
                </tr>
              </tbody>
            </table>
          </SectionCard>

          <SectionCard title="Category Distribution">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  dataKey="value"
                  stroke="none"
                  label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                    const RADIAN = Math.PI / 180;
                    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                    const x = cx + radius * Math.cos(-midAngle * RADIAN);
                    const y = cy + radius * Math.sin(-midAngle * RADIAN);

                    return percent > 0.05 ? (
                      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight="bold">
                        {`${(percent * 100).toFixed(0)}%`}
                      </text>
                    ) : null;
                  }}
                  labelLine={false}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Legend layout="vertical" align="right" verticalAlign="middle" />
              </PieChart>
            </ResponsiveContainer>
          </SectionCard>

          {/* Respondents */}
          <div
            className="p-6 text-center transition duration-200 bg-white border border-gray-200 shadow-md cursor-pointer dark:bg-gray-900 rounded-xl dark:border-gray-700 hover:shadow-lg"
          >
            <h2 className="mb-1 text-lg font-semibold text-gray-800 dark:text-white">Total Respondents</h2>
            <p className="text-4xl font-bold text-purple-600 dark:text-purple-400">
              {totalRespondents} / {totalStudentsHandled}
            </p>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Response Rate: {(responseRate * 100).toFixed(1)}%
            </p>
          </div>
        </div>

        {/* ================= Analyzed Results ================= */}
        <div className="grid gap-6 mt-6 md:grid-cols-2">
          <SectionCard title="Sentiment Summary (Analyzed)">
            <div className="flex items-center justify-between text-sm">
              <p className="text-gray-600 dark:text-gray-300">Total analyzed feedback:</p>
              <p className="font-semibold">{totalAnalyzed}</p>
            </div>

            <div className="mt-4 space-y-2">
              {sentimentData.map((s) => (
                <div key={s.name} className="flex justify-between text-sm">
                  <span className="capitalize">{s.name}</span>
                  <span className="font-medium">{s.value}</span>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Top Improvement Recommendations">
            {topWeaknessRecommendations.length === 0 ? (
              <p className="italic text-gray-500">No recommendations yet.</p>
            ) : (
              <ul className="space-y-3">
                {topWeaknessRecommendations.map((r) => (
                  <li key={r.id} className="p-3 border rounded-lg dark:border-gray-700">
                    <p className="font-semibold">
                      {r.name} <span className="text-xs text-gray-500">({r.total})</span>
                    </p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{r.recommendation}</p>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <SectionCard title="Strength Categories (Analyzed)" className="border-green-200 dark:border-green-700">
            {strengthCategories.length === 0 ? (
              <p className="italic text-gray-500">No detected strength categories.</p>
            ) : (
              <ul className="space-y-2">
                {strengthCategories.slice(0, 8).map((c) => (
                  <li key={c.category_id} className="flex justify-between text-sm">
                    <span>{c.category_name}</span>
                    <span className="font-semibold">{c.total}</span>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard title="Weakness Categories (Analyzed)" className="border-red-200 dark:border-red-700">
            {weaknessCategories.length === 0 ? (
              <p className="italic text-gray-500">No detected weakness categories.</p>
            ) : (
              <ul className="space-y-2">
                {weaknessCategories.slice(0, 8).map((c) => (
                  <li key={c.category_id} className="flex justify-between text-sm">
                    <span>{c.category_name}</span>
                    <span className="font-semibold">{c.total}</span>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>

        {(strengthsList.length > 0 || weaknessesList.length > 0) && (
          <div className="grid gap-6 mt-2 md:grid-cols-2">
            <SectionCard title="Strengths" className="border-green-300 dark:border-green-600">
              {strengthsList.length === 0 ? (
                <p className="italic text-gray-500">No strengths provided.</p>
              ) : (
                <ul className="space-y-2 text-gray-800 list-disc list-inside dark:text-gray-200">
                  {strengthsList.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              )}
            </SectionCard>

            <SectionCard title="Weaknesses" className="border-red-300 dark:border-red-600">
              {weaknessesList.length === 0 ? (
                <p className="italic text-gray-500">No weaknesses provided.</p>
              ) : (
                <ul className="space-y-2 text-gray-800 list-disc list-inside dark:text-gray-200">
                  {weaknessesList.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              )}
            </SectionCard>
          </div>
        )}
      </div>


    </AuthenticatedLayout>
  );
}
